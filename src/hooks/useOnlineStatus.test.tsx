import { useLayoutEffect } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useOnlineStatus } from "./useOnlineStatus";

function connection(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: online,
  });
  window.dispatchEvent(new Event(online ? "online" : "offline"));
}

function Status() {
  return <p>{useOnlineStatus() ? "Connected" : "Offline"}</p>;
}

afterEach(() => {
  cleanup();
  connection(true);
});

describe("connection signal consistency", () => {
  it("observes a connection lost after render but before passive subscription", () => {
    connection(true);
    function DisconnectDuringCommit() {
      useLayoutEffect(() => connection(false), []);
      return null;
    }
    render(
      <>
        <Status />
        <DisconnectDuringCommit />
      </>,
    );
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("keeps separate subscribers consistent through disconnection and recovery", () => {
    connection(false);
    render(
      <>
        <Status />
        <Status />
      </>,
    );
    expect(screen.getAllByText("Offline")).toHaveLength(2);
    act(() => connection(true));
    expect(screen.getAllByText("Connected")).toHaveLength(2);
  });
});
