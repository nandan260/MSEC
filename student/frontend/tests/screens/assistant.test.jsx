import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import AssistantScreen from "../../src/screens/AssistantScreen";
import { assistantRequest, downloadCard } from "../../src/assistant-api";
vi.mock("../../src/assistant-api", () => ({
  assistantRequest: vi.fn(),
  downloadCard: vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  assistantRequest.mockResolvedValue({ configured: true, model: "fake" });
});

it("suggestions fill composer; chat safely renders text, actions and cards; exports both formats", async () => {
  const navigate = vi.fn();
  const card = {
    kind: "study",
    title: "Paxos",
    summary: "General knowledge",
    sections: [],
    slides: [{ title: "Quorum", bullets: ["Majority"] }],
  };
  render(<AssistantScreen onNavigate={navigate} />);
  await screen.findByText("Connected · fake");
  fireEvent.click(screen.getByRole("button", { name: "Upcoming exams" }));
  expect(screen.getByLabelText("Message Ask AI")).toHaveValue("Upcoming exams");
  assistantRequest.mockResolvedValueOnce({
    message: "<img src=x onerror=alert(1)>",
    actions: [
      { type: "navigate", screen: "examinations", label: "Open exams" },
      { type: "navigate", screen: "javascript:alert(1)", label: "Bad action" },
    ],
    cards: [card],
    trace: ["navigate"],
    warnings: [],
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(
    await screen.findByText("<img src=x onerror=alert(1)>"),
  ).toBeInTheDocument();
  expect(document.querySelector("img")).toBeNull();
  expect(screen.queryByText("Bad action")).toBeNull();
  expect(assistantRequest).toHaveBeenLastCalledWith("chat", {
    currentScreen: "assistant",
    messages: [{ role: "user", content: "Upcoming exams" }],
  });
  fireEvent.click(screen.getByRole("button", { name: "Open exams" }));
  expect(navigate).toHaveBeenCalledWith("examinations");
  for (const format of ["pptx", "pdf"]) {
    fireEvent.click(
      screen.getByRole("button", { name: `Download ${format.toUpperCase()}` }),
    );
    await waitFor(() =>
      expect(downloadCard).toHaveBeenLastCalledWith(card, format),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Download PDF" }),
      ).toBeEnabled(),
    );
  }
  expect(screen.getByLabelText("Message Ask AI")).toHaveValue("");
});

it("not configured is honest and retains draft", async () => {
  assistantRequest.mockResolvedValue({ configured: false, model: "" });
  render(<AssistantScreen />);
  await screen.findByText(/AI is not configured/);
  fireEvent.change(screen.getByLabelText("Message Ask AI"), {
    target: { value: "My question" },
  });
  expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  expect(screen.getByLabelText("Message Ask AI")).toHaveValue("My question");
});

it("chat failure retains input for retry; successful retry includes only accepted conversation", async () => {
  render(<AssistantScreen />);
  await screen.findByText("Connected · fake");
  fireEvent.change(screen.getByLabelText("Message Ask AI"), {
    target: { value: "My attendance" },
  });
  assistantRequest.mockRejectedValueOnce(new Error("Student API unavailable"));
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Student API unavailable",
  );
  expect(screen.getByLabelText("Message Ask AI")).toHaveValue("My attendance");
  assistantRequest.mockResolvedValueOnce({
    message: "Try attendance",
    actions: [],
    cards: [],
    trace: [],
    warnings: [],
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText("Try attendance");
  expect(screen.getByLabelText("Message Ask AI")).toHaveValue("");
});
