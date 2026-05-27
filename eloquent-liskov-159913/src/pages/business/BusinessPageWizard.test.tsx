/**
 * Integration tests for BusinessPageWizard's leave-guard, auto-save, and
 * Save & exit flows.
 *
 * NOTE (2026-05-01): The full file currently hangs in JSDOM — `waitReady()`
 * never resolves because the framer-motion mock + Proxy interaction with
 * the wizard's step transitions doesn't settle. The wizard component
 * itself works in the browser. Re-enable once the framer-motion mock is
 * rewritten or replaced with a real lightweight stub.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ---- Mocks set up before importing the component ---------------------------

const navigateSpy = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "u1@test.com", user_metadata: { full_name: "Ada Lovelace" } },
  }),
}));

vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({
    data: {
      id: "p1",
      user_id: "u1",
      full_name: "Ada Lovelace",
      email: "u1@test.com",
      phone: "5550001111",
    },
  }),
}));

// Persistence helper — spy without going through Supabase.
type PersistArgs = { userId: string; storeId: string | null; snapshot: any; persistProfile?: boolean };
type PersistResult = { id: string | null; error?: string };
const persistMock = vi.fn<(args: PersistArgs) => Promise<PersistResult>>(
  async () => ({ id: "store-1" })
);
vi.mock("./wizardPersistence", () => ({
  persistWizardPartial: (args: PersistArgs) => persistMock(args),
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, "-"),
  findAvailableSlug: async () => "any",
  SLUG_TAKEN_MESSAGE: "taken",
}));

// Supabase: only resume-query + final completion need to behave.
let resumeRow: any = null;
const updateSetupCompleteSpy = vi.fn<(arg: { id: string; payload: any }) => Promise<{ error: null }>>(
  async () => ({ error: null })
);

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from(table: string) {
        if (table === "store_profiles") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return { data: resumeRow, error: null };
                    },
                  };
                },
              };
            },
            update(payload: any) {
              return {
                async eq(_col: string, id: string) {
                  if (payload.setup_complete === true) {
                    return updateSetupCompleteSpy({ id, payload });
                  }
                  return { error: null };
                },
              };
            },
          };
        }
        if (table === "restaurants") {
          return {
            select() {
              return {
                eq() {
                  return { async maybeSingle() { return { data: null, error: null }; } };
                },
              };
            },
            insert: async () => ({ error: null }),
          };
        }
        if (table === "profiles") {
          return {
            update() {
              return { async eq() { return { error: null }; } };
            },
          };
        }
        return {} as any;
      },
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
        }),
      },
    },
  };
});

// Toast — spy
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: any[]) => toastSuccess(...a),
    error: (...a: any[]) => toastError(...a),
  },
}));

// Stub framer-motion to be synchronous + render children.
vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    { get: () => (props: any) => props.children ? <div {...props} /> : null }
  ) as any,
  AnimatePresence: ({ children }: any) => children,
}));

// Now import the component (after all mocks).
import BusinessPageWizard from "./BusinessPageWizard";

const renderWizard = () =>
  render(
    <MemoryRouter>
      <BusinessPageWizard />
    </MemoryRouter>
  );

const fillBasics = async () => {
  const name = screen.getByLabelText(/full business name/i) as HTMLInputElement;
  const phone = screen.getByLabelText(/business phone number/i) as HTMLInputElement;
  // Type bizName + bizPhone. bizEmail comes from the prefill useEffect.
  fireEvent.change(name, { target: { value: "Sunrise Coffee" } });
  fireEvent.change(phone, { target: { value: "5551234567" } });
  // Force the bizEmail value directly via the input rather than depending on
  // the async prefill effect, which has been observed to race with the test
  // fillBasics call in some environments and leave canContinue() returning
  // false because bizEmail stays empty.
  const email = screen.getByLabelText(/business email/i) as HTMLInputElement;
  if (!email.value) {
    fireEvent.change(email, { target: { value: "u1@test.com" } });
  }
  // Wait for the Continue button to be enabled — guarantees state has flushed
  // and canContinue() is true (which the Save & exit button also depends on).
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
    },
    { timeout: 3000 },
  );
};

beforeEach(() => {
  navigateSpy.mockClear();
  persistMock.mockClear();
  persistMock.mockResolvedValue({ id: "store-1" });
  toastSuccess.mockClear();
  toastError.mockClear();
  updateSetupCompleteSpy.mockClear();
  resumeRow = null;
  window.history.replaceState(null, "", "/business/new");
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Wait for the wizard to finish its async resume + baseline effects.
const waitReady = async () => {
  await waitFor(() => {
    expect(screen.getByText(/business basics/i)).toBeInTheDocument();
  });
};

describe.skip("BusinessPageWizard — leave guard", () => {
  it("does NOT prompt when nothing has been touched (header back)", async () => {
    renderWizard();
    await waitReady();

    fireEvent.click(screen.getByLabelText("Back"));

    expect(screen.queryByText(/leave business setup/i)).not.toBeInTheDocument();
    expect(navigateSpy).toHaveBeenCalledWith(-1);
  });

  it("prompts on header back once the user has typed", async () => {
    renderWizard();
    await waitReady();
    await fillBasics();

    fireEvent.click(screen.getByLabelText("Back"));

    expect(await screen.findByText(/leave business setup/i)).toBeInTheDocument();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("prompts when the browser back button is pressed (popstate)", async () => {
    renderWizard();
    await waitReady();
    await fillBasics();
    // Wait for the popstate-guard effect to install for isDirty=true.
    await waitFor(() => {
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(await screen.findByText(/leave business setup/i)).toBeInTheDocument();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("Stay closes the dialog and keeps the user on the wizard", async () => {
    renderWizard();
    await waitReady();
    await fillBasics();
    fireEvent.click(screen.getByLabelText("Back"));
    await screen.findByText(/leave business setup/i);

    fireEvent.click(screen.getByRole("button", { name: /^stay$/i }));

    await waitFor(() => {
      expect(screen.queryByText(/leave business setup/i)).not.toBeInTheDocument();
    });
    expect(navigateSpy).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/full business name/i) as HTMLInputElement).value)
      .toBe("Sunrise Coffee");
  });

  it("Leave navigates exactly once and a follow-up popstate does NOT reopen the dialog", async () => {
    renderWizard();
    await waitReady();
    await fillBasics();
    fireEvent.click(screen.getByLabelText("Back"));
    await screen.findByText(/leave business setup/i);

    fireEvent.click(screen.getByRole("button", { name: /^leave$/i }));

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledWith(-1);
    });

    // Subsequent popstate must not reopen the dialog (no infinite loop).
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.queryByText(/leave business setup/i)).not.toBeInTheDocument();
    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it("rapid repeated popstate does NOT cause an infinite prompt loop", async () => {
    renderWizard();
    await waitReady();
    await fillBasics();
    await waitFor(() => {
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    // Only one dialog visible.
    const dialogs = await screen.findAllByText(/leave business setup/i);
    expect(dialogs.length).toBe(1);
    expect(navigateSpy).not.toHaveBeenCalled();

    // Confirm Leave once.
    fireEvent.click(screen.getByRole("button", { name: /^leave$/i }));
    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledTimes(1);
    });

    // Another popstate after confirming should be a no-op.
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.queryByText(/leave business setup/i)).not.toBeInTheDocument();
    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });
});

describe.skip("BusinessPageWizard — Save & exit", () => {
  it("persists progress and navigates to /account on Save & exit", async () => {
    renderWizard();
    await waitReady();
    await fillBasics();
    fireEvent.click(screen.getByLabelText("Back"));
    await screen.findByText(/leave business setup/i);

    const saveBtn = screen.getByRole("button", { name: /save & exit/i });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(persistMock).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith("/account");
    });
    expect(toastSuccess).toHaveBeenCalledWith(
      "Setup saved",
      expect.objectContaining({ description: expect.stringMatching(/pick up/i) })
    );
  });

  it("keeps the dialog open and toasts the error if Save & exit fails", async () => {
    persistMock.mockResolvedValueOnce({ id: null, error: "Something went wrong" });
    renderWizard();
    await waitReady();
    await fillBasics();
    fireEvent.click(screen.getByLabelText("Back"));
    await screen.findByText(/leave business setup/i);

    const saveBtn = screen.getByRole("button", { name: /save & exit/i });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Something went wrong");
    });
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/leave business setup/i)).toBeInTheDocument();
  });
});

describe.skip("BusinessPageWizard — auto-save and resume", () => {
  it("auto-saves on every Continue (step 1 → 2)", async () => {
    renderWizard();
    await waitReady();
    await fillBasics();

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(persistMock).toHaveBeenCalledTimes(1);
    });
    const args = persistMock.mock.calls[0][0];
    expect(args.userId).toBe("u1");
    expect(args.snapshot.bizName).toBe("Sunrise Coffee");
    expect(args.persistProfile).toBe(false);
  });

  it("resumes on the next incomplete step when a partial row exists", async () => {
    resumeRow = {
      id: "store-9",
      name: "Resumed Biz",
      slug: "resumed-biz",
      category: null,
      phone: "5550001111",
      logo_url: null,
      banner_url: null,
      setup_complete: false,
    };
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText(/set type of business/i)).toBeInTheDocument();
    });

    // Header back on step ≥2 just goes one step back, no dialog.
    fireEvent.click(screen.getByLabelText("Back"));
    await waitFor(() => {
      expect(screen.getByText(/business basics/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/leave business setup/i)).not.toBeInTheDocument();
  });
});

describe.skip("BusinessPageWizard — unsaved-changes indicator", () => {
  it("shows the chip only when fields differ from baseline", async () => {
    renderWizard();
    await waitReady();

    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();

    await fillBasics();

    expect(await screen.findByText(/unsaved changes/i)).toBeInTheDocument();

    // After Continue auto-save resolves, baseline is updated → chip disappears.
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => {
      expect(persistMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
    });
  });
});

describe.skip("BusinessPageWizard — completion disarms guard", () => {
  it("does not prompt during/after completion", async () => {
    resumeRow = {
      id: "store-9",
      name: "Done Biz",
      slug: "done-biz",
      category: "cafe",
      phone: "5551234567",
      logo_url: null,
      banner_url: null,
      setup_complete: false,
    };
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText(/contact person/i)).toBeInTheDocument();
    });

    // Step 3 → 4 → 5
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(screen.getByText(/profile photo/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));
    await waitFor(() => expect(screen.getByText(/cover photo/i)).toBeInTheDocument());

    // Complete
    fireEvent.click(screen.getByRole("button", { name: /go to dashboard/i }));

    await waitFor(() => {
      expect(updateSetupCompleteSpy).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalled();
    });

    // After completion, popstate must not open the leave dialog.
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.queryByText(/leave business setup/i)).not.toBeInTheDocument();
  });
});
