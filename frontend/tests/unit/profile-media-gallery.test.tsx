import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MediaGallery } from "../../src/components/profile/media-gallery";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

function mockFetchOnce(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function makeFile(name = "photo.png") {
  return new File(["contents"], name, { type: "image/png" });
}

describe("MediaGallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("access_token", "test-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("renders the empty state when there is no media", () => {
    render(<MediaGallery />);
    expect(screen.getByText(/no media uploaded yet/i)).toBeDefined();
  });

  it("renders the upload button", () => {
    render(<MediaGallery />);
    expect(screen.getByRole("button", { name: /upload/i })).toBeDefined();
  });

  it("uploads a file and adds it to the gallery on success", async () => {
    mockFetchOnce({ id: "media-1", url: "https://example.com/photo.png" });
    render(<MediaGallery />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Media uploaded!");
    });

    expect(screen.queryByText(/no media uploaded yet/i)).toBeNull();
    expect(screen.getAllByAltText("Gallery item").length).toBe(1);
  });

  it("sends the file as multipart form data with an auth header", async () => {
    const fetchMock = mockFetchOnce({ id: "media-1", url: "https://example.com/photo.png" });
    render(<MediaGallery />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/profiles/me/media");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer test-token");
    expect(options.body).toBeInstanceOf(FormData);
  });

  it("shows a toast error and stays empty when the upload fails", async () => {
    mockFetchOnce({}, false);
    render(<MediaGallery />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Upload failed");
    });
    expect(screen.getByText(/no media uploaded yet/i)).toBeDefined();
  });

  it("shows a generic error toast when the upload request itself rejects with a non-Error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("network exploded"));
    render(<MediaGallery />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Upload failed");
    });
  });

  it("does nothing when the file input change event has an empty file list", () => {
    render(<MediaGallery />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(screen.getByText(/no media uploaded yet/i)).toBeDefined();
  });

  it("does nothing when the change event target has no files property at all", () => {
    render(<MediaGallery />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: undefined } });
    expect(screen.getByText(/no media uploaded yet/i)).toBeDefined();
  });

  it("disables the upload input while uploading", async () => {
    let resolveFetch!: (v: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = () =>
            resolve({ ok: true, json: async () => ({ id: "1", url: "u" }) });
        })
      )
    );

    render(<MediaGallery />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(input.disabled).toBe(true);
    });

    resolveFetch(undefined);

    await waitFor(() => {
      expect(input.disabled).toBe(false);
    });
  });
});
