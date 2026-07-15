import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MediaUploader } from "../../src/components/gallery/MediaUploader";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";

beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

function makeFile(name: string, type: string, sizeBytes: number): File {
  const file = new File(["x".repeat(Math.min(sizeBytes, 10))], name, { type });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

describe("MediaUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it("renders the drop zone and privacy selector", () => {
    render(<MediaUploader />);
    expect(screen.getByText(/drag & drop files/i)).toBeDefined();
    expect(screen.getByText(/upload as:/i)).toBeDefined();
  });

  it("uploads a valid file successfully and calls onUploadComplete", async () => {
    const media = {
      id: "m1",
      user_id: "u1",
      type: "IMAGE",
      url: "https://example.com/x.jpg",
      privacy: "PUBLIC",
      view_count: 0,
      created_at: new Date().toISOString(),
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(media),
    });
    const handleComplete = vi.fn();

    const { container } = render(<MediaUploader onUploadComplete={handleComplete} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("photo.png", "image/png", 1024);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(handleComplete).toHaveBeenCalledWith(media);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/gallery/upload?privacy=PUBLIC"),
      expect.objectContaining({ method: "POST" })
    );
    expect(toast.success).toHaveBeenCalledWith("photo.png uploaded successfully");
    expect(screen.getByText("photo.png")).toBeDefined();
  });

  it("shows an error and calls onUploadError when the server rejects the upload", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: "Server rejected file" }),
    });
    const handleError = vi.fn();

    const { container } = render(<MediaUploader onUploadError={handleError} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("photo.png", "image/png", 1024);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(handleError).toHaveBeenCalledWith("Server rejected file");
    });
    expect(toast.error).toHaveBeenCalledWith("Server rejected file");
    expect(screen.getByText("Server rejected file")).toBeDefined();
  });

  it("rejects unsupported file types client-side without calling fetch", () => {
    // Client-side validateFile() rejections are reported via toast + inline
    // error status, not via onUploadError (that prop is only wired to the
    // uploadFile() catch block for server-side failures).
    const { container } = render(<MediaUploader />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("doc.pdf", "application/pdf", 1024);

    fireEvent.change(input, { target: { files: [file] } });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Unsupported file type"));
    expect(screen.getByText(/unsupported file type/i)).toBeDefined();
  });

  it("rejects an oversized image client-side", () => {
    const { container } = render(<MediaUploader />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("big.png", "image/png", 11 * 1024 * 1024); // > 10MB

    fireEvent.change(input, { target: { files: [file] } });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("File too large"));
  });

  it("rejects an oversized video client-side using the larger video limit", () => {
    const { container } = render(<MediaUploader />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    // Under the image limit but over the (larger) video limit boundary check
    const file = makeFile("big.mp4", "video/mp4", 101 * 1024 * 1024); // > 100MB

    fireEvent.change(input, { target: { files: [file] } });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("File too large"));
  });

  it("accepts a video within the larger video size limit (goes to upload, not client rejection)", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { container } = render(<MediaUploader />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("clip.mp4", "video/mp4", 50 * 1024 * 1024); // valid: under 100MB

    fireEvent.change(input, { target: { files: [file] } });

    expect(global.fetch).toHaveBeenCalled();
  });

  it("respects maxFiles by only accepting the remaining slots", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { container } = render(<MediaUploader maxFiles={1} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = makeFile("one.png", "image/png", 1024);
    const file2 = makeFile("two.png", "image/png", 1024);

    fireEvent.change(input, { target: { files: [file1, file2] } });

    expect(screen.getByText("one.png")).toBeDefined();
    expect(screen.queryByText("two.png")).toBeNull();
  });

  it("removes an upload from the list when its remove button is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { container } = render(<MediaUploader />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("photo.png", "image/png", 1024);

    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText("photo.png")).toBeDefined());

    const removeButtons = screen.getAllByRole("button");
    const removeButton = removeButtons.find((b) => b.querySelector("svg.lucide-x"));
    fireEvent.click(removeButton!);

    expect(screen.queryByText("photo.png")).toBeNull();
  });

  it("clears completed uploads via the Clear completed button", async () => {
    const media = {
      id: "m1",
      user_id: "u1",
      type: "IMAGE",
      url: "https://example.com/x.jpg",
      privacy: "PUBLIC",
      view_count: 0,
      created_at: new Date().toISOString(),
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(media),
    });

    const { container } = render(<MediaUploader />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("photo.png", "image/png", 1024);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/uploads \(1\/1\)/i)).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /clear completed/i }));
    expect(screen.queryByText("photo.png")).toBeNull();
  });

  it("changes the privacy level via the select and includes it in the upload URL", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { container } = render(<MediaUploader />);

    fireEvent.click(screen.getByRole("combobox"));
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Private" })).toBeDefined();
    });
    fireEvent.click(screen.getByRole("option", { name: "Private" }));

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("photo.png", "image/png", 1024);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("privacy=PRIVATE"),
        expect.anything()
      );
    });
  });

  it("sends the auth token from localStorage as a Bearer header", async () => {
    localStorage.setItem("access_token", "test-token-123");
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { container } = render(<MediaUploader />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("photo.png", "image/png", 1024);

    fireEvent.change(input, { target: { files: [file] } });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: { Authorization: "Bearer test-token-123" },
      })
    );
  });

  it("handles drag-over/drag-leave/drop styling and uploads dropped files", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { container } = render(<MediaUploader />);
    const dropZone = screen.getByText(/drag & drop files/i).closest("[class*='border-dashed']")!;

    fireEvent.dragOver(dropZone);
    expect(screen.getByText(/drop files here/i)).toBeDefined();

    fireEvent.dragLeave(dropZone);
    expect(screen.getByText(/drag & drop files/i)).toBeDefined();

    const file = makeFile("dropped.png", "image/png", 1024);
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(global.fetch).toHaveBeenCalled();
    void container;
  });

  it("clicking the drop zone opens the hidden file picker", () => {
    const { container } = render(<MediaUploader />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click").mockImplementation(() => {});

    const dropZone = screen.getByText(/drag & drop files/i).closest("[class*='border-dashed']")!;
    fireEvent.click(dropZone);

    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });
});
