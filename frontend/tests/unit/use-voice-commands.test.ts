import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useVoiceCommands } from "../../src/hooks/use-voice-commands";

// Minimal shape matching the runtime contract the hook depends on.
interface FakeRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: unknown) => void) | null;
  start: () => void;
}

function makeFakeInstance(): FakeRecognitionInstance {
  return {
    continuous: false,
    interimResults: false,
    lang: "",
    onstart: null,
    onend: null,
    onresult: null,
    start: vi.fn(),
  };
}

function makeResultEvent(transcript: string) {
  return {
    results: {
      length: 1,
      0: {
        length: 1,
        0: { transcript, confidence: 1 },
      },
    },
  };
}

describe("useVoiceCommands", () => {
  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown })
      .SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown })
      .webkitSpeechRecognition;
    vi.restoreAllMocks();
  });

  describe("when Speech Recognition is not supported", () => {
    it("logs an error and does not start listening", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result } = renderHook(() => useVoiceCommands({}));

      act(() => {
        result.current.startListening();
      });

      expect(errorSpy).toHaveBeenCalledWith(
        "Speech Recognition not supported in this browser."
      );
      expect(result.current.isListening).toBe(false);
      expect(result.current.transcript).toBe("");
    });
  });

  describe("when Speech Recognition is supported", () => {
    let fakeInstance: FakeRecognitionInstance;
    let ctorSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      fakeInstance = makeFakeInstance();
      // mockImplementation must be a regular function (not an arrow function)
      // so it can be invoked with `new` by the hook under test.
      ctorSpy = vi.fn().mockImplementation(function () {
        return fakeInstance;
      });
      (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition =
        ctorSpy;
    });

    it("constructs, configures, and starts recognition", () => {
      const { result } = renderHook(() => useVoiceCommands({}));

      act(() => {
        result.current.startListening();
      });

      expect(ctorSpy).toHaveBeenCalledTimes(1);
      expect(fakeInstance.continuous).toBe(false);
      expect(fakeInstance.interimResults).toBe(false);
      expect(fakeInstance.lang).toBe("en-US");
      expect(fakeInstance.start).toHaveBeenCalledTimes(1);
    });

    it("toggles isListening true on onstart and false on onend", () => {
      const { result } = renderHook(() => useVoiceCommands({}));

      act(() => {
        result.current.startListening();
      });

      expect(result.current.isListening).toBe(false);

      act(() => {
        fakeInstance.onstart?.();
      });
      expect(result.current.isListening).toBe(true);

      act(() => {
        fakeInstance.onend?.();
      });
      expect(result.current.isListening).toBe(false);
    });

    it("sets transcript (lowercased) on result", () => {
      const { result } = renderHook(() => useVoiceCommands({}));

      act(() => {
        result.current.startListening();
      });

      act(() => {
        fakeInstance.onresult?.(makeResultEvent("Hello World"));
      });

      expect(result.current.transcript).toBe("hello world");
    });

    it("invokes a matching command callback when transcript contains it (case-insensitive)", () => {
      const openMenu = vi.fn();
      const closeMenu = vi.fn();
      const { result } = renderHook(() =>
        useVoiceCommands({ "open menu": openMenu, "close menu": closeMenu })
      );

      act(() => {
        result.current.startListening();
      });

      act(() => {
        fakeInstance.onresult?.(makeResultEvent("please OPEN MENU now"));
      });

      expect(openMenu).toHaveBeenCalledTimes(1);
      expect(closeMenu).not.toHaveBeenCalled();
      expect(result.current.transcript).toBe("please open menu now");
    });

    it("does not invoke any command callback when transcript matches nothing", () => {
      const doThing = vi.fn();
      const { result } = renderHook(() =>
        useVoiceCommands({ "do thing": doThing })
      );

      act(() => {
        result.current.startListening();
      });

      act(() => {
        fakeInstance.onresult?.(makeResultEvent("unrelated words"));
      });

      expect(doThing).not.toHaveBeenCalled();
    });

    it("falls back to webkitSpeechRecognition when SpeechRecognition is absent", () => {
      delete (window as unknown as { SpeechRecognition?: unknown })
        .SpeechRecognition;
      const webkitCtor = vi.fn().mockImplementation(function () {
        return fakeInstance;
      });
      (
        window as unknown as { webkitSpeechRecognition: unknown }
      ).webkitSpeechRecognition = webkitCtor;

      const { result } = renderHook(() => useVoiceCommands({}));

      act(() => {
        result.current.startListening();
      });

      expect(webkitCtor).toHaveBeenCalledTimes(1);
      expect(fakeInstance.start).toHaveBeenCalledTimes(1);
    });
  });
});
