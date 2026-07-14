import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm, FieldValues } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "../../src/components/ui/form";
import { Input } from "../../src/components/ui/input";

function TestForm({
  defaultValues = {},
  requireEmail = false,
}: {
  defaultValues?: Record<string, unknown>;
  requireEmail?: boolean;
}) {
  const form = useForm<FieldValues>({
    defaultValues: { email: "", ...defaultValues },
    mode: "onChange",
  });

  const onSubmit = form.handleSubmit(() => {});

  return (
    <Form {...form}>
      <form onSubmit={onSubmit}>
        <FormField
          control={form.control}
          name="email"
          rules={
            requireEmail
              ? { required: "Email is required" }
              : undefined
          }
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormDescription>We will never share your email.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}

describe("Form (react-hook-form integration)", () => {
  it("renders FormLabel with htmlFor pointing at the FormControl's generated id", () => {
    render(<TestForm />);

    const label = screen.getByText("Email");
    const input = screen.getByPlaceholderText("you@example.com");

    expect(label.getAttribute("for")).toBe(input.id);
  });

  it("renders FormDescription text and wires it via aria-describedby when there is no error", () => {
    render(<TestForm />);

    const input = screen.getByPlaceholderText("you@example.com");
    const description = screen.getByText("We will never share your email.");

    expect(input.getAttribute("aria-describedby")).toContain(description.id);
    expect(input.getAttribute("aria-invalid")).toBe("false");
  });

  it("renders no FormMessage content when there is no validation error", () => {
    render(<TestForm />);

    // FormMessage returns null when there's no error and no children passed
    expect(screen.queryByText(/required/i)).toBeNull();
  });

  it("shows the validation error message in FormMessage after a failed submit", async () => {
    render(<TestForm requireEmail />);

    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeDefined();
    });
  });

  it("marks FormLabel and the input as errored (data-error / aria-invalid) when validation fails", async () => {
    render(<TestForm requireEmail />);

    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeDefined();
    });

    const label = screen.getByText("Email");
    const input = screen.getByPlaceholderText("you@example.com");

    expect(label.getAttribute("data-error")).toBe("true");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("clears the FormMessage once the field becomes valid again", async () => {
    render(<TestForm requireEmail />);

    fireEvent.click(screen.getByText("Submit"));
    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeDefined();
    });

    const input = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(input, { target: { value: "person@example.com" } });

    await waitFor(() => {
      expect(screen.queryByText("Email is required")).toBeNull();
    });
  });

  it("aria-describedby includes both description and message ids when there is an error", async () => {
    render(<TestForm requireEmail />);

    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeDefined();
    });

    const input = screen.getByPlaceholderText("you@example.com");
    const description = screen.getByText("We will never share your email.");
    const message = screen.getByText("Email is required");

    const describedBy = input.getAttribute("aria-describedby") || "";
    expect(describedBy).toContain(description.id);
    expect(describedBy).toContain(message.id);
  });

  it("pre-fills the field value from defaultValues via the Controller-driven FormControl", () => {
    render(<TestForm defaultValues={{ email: "existing@example.com" }} />);

    const input = screen.getByPlaceholderText("you@example.com") as HTMLInputElement;
    expect(input.value).toBe("existing@example.com");
  });

  it("renders static children passed to FormMessage when there is no validation error (non-error hint usage)", () => {
    function StaticMessageForm() {
      const form = useForm<FieldValues>({ defaultValues: { email: "" } });
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="email"
            render={() => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormMessage>Optional hint text</FormMessage>
              </FormItem>
            )}
          />
        </Form>
      );
    }

    render(<StaticMessageForm />);

    expect(screen.getByText("Optional hint text")).toBeDefined();
  });
});
