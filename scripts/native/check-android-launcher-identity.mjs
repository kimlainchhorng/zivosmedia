#!/usr/bin/env node
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const canonicalIcon = "android/store-listing/icon-512.png";
const densitySizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};
const launcherFiles = [
  "ic_launcher.png",
  "ic_launcher_round.png",
  "ic_launcher_foreground.png",
];

const absolute = (relativePath) => path.join(root, relativePath);
const failures = [];

try {
  const metadata = await sharp(absolute(canonicalIcon)).metadata();
  if (
    metadata.format !== "png" ||
    metadata.width !== 512 ||
    metadata.height !== 512
  ) {
    failures.push(`${canonicalIcon} must be a 512 x 512 PNG`);
  }
} catch (error) {
  failures.push(`${canonicalIcon} could not be read: ${error.message}`);
}

for (const [density, size] of Object.entries(densitySizes)) {
  let expected;
  try {
    expected = await sharp(absolute(canonicalIcon))
      .resize(size, size)
      .ensureAlpha()
      .raw()
      .toBuffer();
  } catch {
    continue;
  }

  for (const fileName of launcherFiles) {
    const relativePath = `android/app/src/main/res/mipmap-${density}/${fileName}`;
    try {
      const actual = await sharp(absolute(relativePath))
        .ensureAlpha()
        .raw()
        .toBuffer();

      if (!actual.equals(expected)) {
        failures.push(`${relativePath} does not match ${canonicalIcon}`);
      }
    } catch (error) {
      failures.push(`${relativePath} could not be read: ${error.message}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Android launcher identity check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "\nRun `npm run android:icons:generate`, then rerun this check.",
  );
  process.exit(1);
}

console.log(
  `Android launcher identity verified: ${launcherFiles.length * Object.keys(densitySizes).length} generated assets match ${canonicalIcon}.`,
);
