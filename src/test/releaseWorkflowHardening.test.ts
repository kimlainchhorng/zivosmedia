import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detectBot } from "../../supabase/functions/_shared/botDetection";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("pre-release workflow authority", () => {
  it("builds release mobile payloads only after production environment and strict preflight", () => {
    const workflow = read(".github/workflows/mobile-build.yml");
    const environmentCheck = workflow.indexOf(
      "name: Check production web release environment",
    );
    const strictPreflight = workflow.indexOf(
      "name: Run strict production preflight",
    );
    const build = workflow.indexOf("      - name: Build web bundle");

    expect(workflow).toContain("workflow_call:");
    expect(workflow).toContain("release_sha:");
    expect(workflow).toMatch(
      /release_sha:\n\s+description: "Exact commit tagged by release-please"\n\s+required: true/,
    );
    expect(
      workflow.match(/ref: \${{ inputs\.release_sha \|\| github\.sha }}/g),
    ).toHaveLength(3);
    expect(environmentCheck).toBeGreaterThan(-1);
    expect(strictPreflight).toBeGreaterThan(environmentCheck);
    expect(build).toBeGreaterThan(strictPreflight);
    const preflightBlock = workflow.slice(strictPreflight, build);
    expect(preflightBlock).toContain(
      "if: github.event_name == 'push' || inputs.release_type == 'release'",
    );
    expect(workflow).toContain(
      "npm run deploy:preflight:strict -- --skip-build --skip-type-check",
    );
    expect(workflow).toContain(
      "VITE_ZIVO_RIDE_APP_URL must equal https://ride.zivosmedia.com exactly.",
    );
    expect(workflow).toContain("ZIVO_EDGE_FUNCTIONS_LIVE_SNAPSHOT=");

    for (const secret of [
      "SUPABASE_ACCESS_TOKEN",
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_PROJECT_ID",
      "VITE_STRIPE_PUBLISHABLE_KEY",
      "VITE_ZIVO_RIDE_APP_URL",
      "VITE_ZIVO_SOFTWARE_SUPABASE_URL",
      "VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY",
      "ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY",
      "ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY",
      "ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY",
      "VITE_VAPID_PUBLIC_KEY",
    ]) {
      expect(workflow).toContain(`${secret}: \${{ secrets.${secret} }}`);
    }

    const buildBlock = workflow.slice(
      build,
      workflow.indexOf("uses: actions/upload-artifact", build),
    );
    expect(buildBlock).toContain("VITE_SUPABASE_URL:");
    expect(buildBlock).toContain("VITE_SUPABASE_PUBLISHABLE_KEY:");
    expect(buildBlock).toContain("VITE_SUPABASE_PROJECT_ID:");
    expect(buildBlock).toContain(
      "VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}",
    );
    expect(buildBlock).toContain("VITE_ZIVO_RIDE_APP_URL:");
    expect(buildBlock).toContain("VITE_VAPID_PUBLIC_KEY:");
  });

  it("starts mobile builds directly when release-please creates a release", () => {
    const workflow = read(".github/workflows/release.yml");
    const authorityJob = workflow.indexOf("  release-authority:");
    const releaseJob = workflow.indexOf("  release-please:");
    const mobileJob = workflow.indexOf("  mobile-build:");

    expect(authorityJob).toBeGreaterThan(-1);
    expect(releaseJob).toBeGreaterThan(authorityJob);
    expect(releaseJob).toBeGreaterThan(-1);
    expect(mobileJob).toBeGreaterThan(releaseJob);
    expect(workflow).toContain("needs: release-authority");
    expect(workflow).toContain(
      "release_created: ${{ steps.release.outputs.release_created }}",
    );
    expect(workflow).toContain("release_sha: ${{ steps.release.outputs.sha }}");
    expect(workflow).toContain("needs: release-please");
    expect(workflow).toContain(
      "if: needs.release-please.outputs.release_created == 'true'",
    );
    expect(workflow).toContain("uses: ./.github/workflows/mobile-build.yml");
    expect(workflow).toContain("release_type: release");
    expect(workflow).toContain(
      "release_sha: ${{ needs.release-please.outputs.release_sha }}",
    );
    expect(workflow).toContain("secrets: inherit");
    expect(workflow).toContain("If a PAT or GitHub App token is");
  });

  it("blocks GitHub Release, production native, Cloudflare, and Netlify paths until every Wallet cash-out function is a tombstone", () => {
    const release = read(".github/workflows/release.yml");
    const mobile = read(".github/workflows/mobile-build.yml");
    const cloudflare = read(
      ".github/workflows/deploy-cloudflare-production.yml",
    );
    const netlify = read(".github/workflows/deploy-production.yml");
    const tombstoneStepName = "      - name: Verify Wallet cash-out tombstones";
    const slugs = [
      "process-withdrawal",
      "connect-instant-payout",
      "paypal-payout",
      "wallet-instant-payout",
      "stripe-instant-payout",
    ];
    const gateScripts: string[] = [];

    for (const [workflow, releaseBoundary, gateEndBoundary] of [
      [release, "  release-please:", "\n  release-please:"],
      [mobile, "      - name: Build web bundle", "\n      - name:"],
      [
        cloudflare,
        "      - name: Deploy Worker to Cloudflare",
        "\n      - name:",
      ],
      [
        netlify,
        "      - name: Deploy production to Netlify",
        "\n      - name:",
      ],
    ] as const) {
      const stepStart = workflow.indexOf(tombstoneStepName);
      const stepEnd = workflow.indexOf(
        gateEndBoundary,
        stepStart + tombstoneStepName.length,
      );
      const gate = workflow.slice(stepStart, stepEnd);
      const runMarker = "        run: |\n";
      const runStart = gate.indexOf(runMarker);

      expect(stepStart).toBeGreaterThan(-1);
      expect(stepEnd).toBeGreaterThan(stepStart);
      expect(runStart).toBeGreaterThan(-1);
      expect(workflow.indexOf(releaseBoundary)).toBeGreaterThan(stepStart);
      expect(gate).toContain(
        'cashout_base_url="https://slirphzzwcogdbkeicff.supabase.co/functions/v1"',
      );
      for (const slug of slugs) expect(gate).toContain(slug);
      expect(gate.match(/--request POST/g)).toHaveLength(1);
      expect(
        gate.match(/--header 'user-agent: ZIVO-Release-Gate\/1\.0'/g),
      ).toHaveLength(1);
      expect(gate.match(/--data-binary ''/g)).toHaveLength(1);
      expect(gate).toContain('if [ "$http_status" != "503" ]');
      expect(gate).toContain(
        'payload?.code !== "wallet_cashout_authority_unavailable"',
      );
      expect(gate).not.toMatch(/authorization|apikey|service[_-]?role/i);
      expect(gate).not.toContain("${{ secrets.");
      expect(gate).not.toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
      expect(gate).not.toContain("SUPABASE_ANON_KEY");
      expect(gate).not.toMatch(/--header ['"]origin:/i);
      gateScripts.push(
        gate.slice(runStart + runMarker.length).replace(/^ {10}/gm, ""),
      );
    }

    for (const script of gateScripts.slice(1)) {
      expect(script).toBe(gateScripts[0]);
    }

    const mobileGateStart = mobile.indexOf(tombstoneStepName);
    const mobileGateEnd = mobile.indexOf(
      "\n      - name:",
      mobileGateStart + tombstoneStepName.length,
    );
    expect(mobile.slice(mobileGateStart, mobileGateEnd)).toContain(
      "if: github.event_name == 'push' || inputs.release_type == 'release'",
    );
    expect(release).toContain("permissions: {}");
    expect(release).toContain("needs: release-authority");
  });

  it("uses a stable release-gate User-Agent that the shared Edge bot detector allows", () => {
    const releaseGate = detectBot(
      new Headers({
        accept: "application/json",
        "user-agent": "ZIVO-Release-Gate/1.0",
      }),
    );
    const defaultCurl = detectBot(
      new Headers({
        accept: "application/json",
        "user-agent": "curl/8.7.1",
      }),
    );
    const withSecurity = read("supabase/functions/_shared/withSecurity.ts");

    expect(releaseGate).toMatchObject({ isBot: false, reason: null });
    expect(defaultCurl).toMatchObject({ isBot: true, reason: "scraper" });
    expect(withSecurity).toContain("const bot = detectBot(req.headers)");
    expect(withSecurity).toContain("bot.reason === 'scraper'");
  });

  it("requires a browser-safe Stripe publishable key before release and injects it into production Vite builds", () => {
    const release = read(".github/workflows/release.yml");
    const mobile = read(".github/workflows/mobile-build.yml");
    const cloudflare = read(
      ".github/workflows/deploy-cloudflare-production.yml",
    );
    const netlify = read(".github/workflows/deploy-production.yml");
    const stripeSecret =
      "VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}";

    const releaseCheckStart = release.indexOf(
      "      - name: Check browser-safe Stripe release key",
    );
    const releaseCheckEnd = release.indexOf(
      "\n      - name: Verify Wallet cash-out tombstones",
      releaseCheckStart,
    );
    const releaseCheck = release.slice(releaseCheckStart, releaseCheckEnd);
    expect(releaseCheckStart).toBeGreaterThan(-1);
    expect(releaseCheckEnd).toBeGreaterThan(releaseCheckStart);
    expect(releaseCheck).toContain(stripeSecret);
    expect(releaseCheck).toContain('[ -z "$VITE_STRIPE_PUBLISHABLE_KEY" ]');
    expect(releaseCheck).toContain(
      '[[ "$VITE_STRIPE_PUBLISHABLE_KEY" != pk_* ]]',
    );
    expect(release.indexOf("  release-please:")).toBeGreaterThan(
      releaseCheckStart,
    );

    const mobileStripeCheckStart = mobile.indexOf(
      "      - name: Check browser-safe Stripe build key",
    );
    const mobileStripeCheckEnd = mobile.indexOf(
      "\n      - name: Check production web release environment",
      mobileStripeCheckStart,
    );
    const mobileStripeCheck = mobile.slice(
      mobileStripeCheckStart,
      mobileStripeCheckEnd,
    );
    expect(mobileStripeCheckStart).toBeGreaterThan(-1);
    expect(mobileStripeCheckEnd).toBeGreaterThan(mobileStripeCheckStart);
    expect(mobileStripeCheck).toContain(stripeSecret);
    expect(mobileStripeCheck).toContain(
      '[ -z "$VITE_STRIPE_PUBLISHABLE_KEY" ]',
    );
    expect(mobileStripeCheck).toContain(
      '[[ "$VITE_STRIPE_PUBLISHABLE_KEY" != pk_* ]]',
    );

    const mobileCheckStart = mobile.indexOf(
      "      - name: Check production web release environment",
    );
    const mobileCheckEnd = mobile.indexOf(
      "\n      - name: Verify Wallet cash-out tombstones",
      mobileCheckStart,
    );
    const mobileCheck = mobile.slice(mobileCheckStart, mobileCheckEnd);
    expect(mobileCheck).toContain(stripeSecret);
    expect(mobileCheck).toContain(
      '[[ "$VITE_STRIPE_PUBLISHABLE_KEY" != pk_* ]]',
    );

    const cloudflareCheckStart = cloudflare.indexOf(
      "      - name: Check Cloudflare deploy secrets",
    );
    const cloudflareCheckEnd = cloudflare.indexOf(
      "\n      - name: Capture live Edge Function auth policies",
      cloudflareCheckStart,
    );
    const cloudflareCheck = cloudflare.slice(
      cloudflareCheckStart,
      cloudflareCheckEnd,
    );
    expect(cloudflareCheck).toContain(stripeSecret);
    expect(cloudflareCheck).toContain(
      '[[ "$VITE_STRIPE_PUBLISHABLE_KEY" != pk_* ]]',
    );

    const mobileBuildStart = mobile.indexOf("      - name: Build web bundle");
    const mobileBuildEnd = mobile.indexOf(
      "\n      - uses: actions/upload-artifact",
      mobileBuildStart,
    );
    expect(mobile.slice(mobileBuildStart, mobileBuildEnd)).toContain(
      stripeSecret,
    );

    const cloudflareBuildStart = cloudflare.indexOf(
      "      - name: Build production bundle",
    );
    const cloudflareBuildEnd = cloudflare.indexOf(
      "\n      - name: Provision Worker AI auth key",
      cloudflareBuildStart,
    );
    expect(
      cloudflare.slice(cloudflareBuildStart, cloudflareBuildEnd),
    ).toContain(stripeSecret);

    const netlifyCheckStart = netlify.indexOf(
      "      - name: Check browser-safe Stripe production key",
    );
    const netlifyCheckEnd = netlify.indexOf(
      "\n      - name: Verify Wallet cash-out tombstones",
      netlifyCheckStart,
    );
    const netlifyCheck = netlify.slice(netlifyCheckStart, netlifyCheckEnd);
    expect(netlifyCheckStart).toBeGreaterThan(-1);
    expect(netlifyCheckEnd).toBeGreaterThan(netlifyCheckStart);
    expect(netlifyCheck).toContain(stripeSecret);
    expect(netlifyCheck).toContain('[ -z "$VITE_STRIPE_PUBLISHABLE_KEY" ]');
    expect(netlifyCheck).toContain(
      '[[ "$VITE_STRIPE_PUBLISHABLE_KEY" != pk_* ]]',
    );

    const netlifyBuildStart = netlify.indexOf(
      "      - name: Build production bundle",
    );
    const netlifyBuildEnd = netlify.indexOf(
      "\n      - name: Check Netlify secrets and deploy environment",
      netlifyBuildStart,
    );
    expect(netlifyBuildStart).toBeGreaterThan(netlifyCheckStart);
    expect(netlify.slice(netlifyBuildStart, netlifyBuildEnd)).toContain(
      stripeSecret,
    );

    for (const workflow of [release, mobile, cloudflare, netlify]) {
      expect(workflow).not.toMatch(
        /\b(?:VITE_)?STRIPE_SECRET_KEY\b|secrets\.STRIPE_SECRET/i,
      );
    }
  });

  it("binds every manual Cloudflare deploy to a successful push CI main commit", () => {
    const workflow = read(".github/workflows/deploy-cloudflare-production.yml");
    const authorize = workflow.indexOf("  authorize:");
    const deploy = workflow.indexOf("  deploy:");

    expect(workflow).toContain("ci_run_id:");
    expect(workflow).toMatch(
      /ci_run_id:\n\s+description:[\s\S]*?\n\s+required: true/,
    );
    expect(workflow).toContain("actions: read");
    expect(workflow).toContain(
      "github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'",
    );
    expect(workflow).toContain("github.event.workflow_run.event == 'push'");
    expect(workflow).toContain(
      "github.event.workflow_run.head_repository.full_name == github.repository",
    );
    expect(authorize).toBeGreaterThan(-1);
    expect(deploy).toBeGreaterThan(authorize);
    expect(workflow).toContain(
      'gh api "/repos/$GITHUB_REPOSITORY/actions/runs/$CI_RUN_ID"',
    );
    expect(workflow).toContain("actions/workflows/ci.yml");
    expect(workflow).toContain('ci_workflow_id" != "$expected_ci_workflow_id"');
    expect(workflow).toContain('ci_event" != "push"');
    expect(workflow).toContain('ci_status" != "completed"');
    expect(workflow).toContain('ci_conclusion" != "success"');
    expect(workflow).toContain('ci_branch" != "main"');
    expect(workflow).toContain("needs: authorize");
    expect(workflow).toContain("ref: ${{ needs.authorize.outputs.sha }}");
    expect(workflow).not.toContain(
      "github.event.workflow_run.head_sha || github.sha",
    );
    expect(workflow).not.toMatch(/^\s+ref:\s+\${{\s*github\.sha\s*}}/m);
    expect(workflow).toContain("edge_snapshot_json=");
    expect(workflow).not.toContain(
      'ZIVO_EDGE_FUNCTIONS_LIVE_SNAPSHOT=%s\\n\' "$edge_snapshot"',
    );

    const netlify = read(".github/workflows/deploy-production.yml");
    expect(netlify).toContain("github.event.workflow_run.event == 'push'");
    expect(netlify).toContain(
      "github.event.workflow_run.head_repository.full_name == github.repository",
    );
    expect(netlify).toContain("ref: ${{ github.event.workflow_run.head_sha }}");
  });
});
