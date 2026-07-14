import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "../../src/components/ui/table";

describe("Table compound components", () => {
  it("renders the correct semantic HTML structure when fully composed", () => {
    const { container } = render(
      <Table data-testid="table">
        <TableCaption>A list of results</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Foo</TableCell>
            <TableCell>42</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>42</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );

    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    expect(table?.querySelector("thead")).not.toBeNull();
    expect(table?.querySelector("tbody")).not.toBeNull();
    expect(table?.querySelector("tfoot")).not.toBeNull();
    expect(table?.querySelector("caption")).not.toBeNull();
    expect(table?.querySelectorAll("tr").length).toBe(3);
    expect(table?.querySelectorAll("th").length).toBe(2);
    expect(table?.querySelectorAll("td").length).toBe(4);
  });

  it("wraps the table in an overflow-auto container div", () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const wrapper = container.querySelector("div.overflow-auto");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector("table")).not.toBeNull();
  });

  it("exposes accessible roles for table/row/cell via testing-library queries", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Column</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Value</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getAllByRole("row").length).toBe(2);
    expect(screen.getByRole("columnheader", { name: "Column" })).toBeDefined();
    expect(screen.getByRole("cell", { name: "Value" })).toBeDefined();
  });

  it("merges custom className on TableRow alongside base classes", () => {
    render(
      <Table>
        <TableBody>
          <TableRow className="my-row-class" data-testid="row">
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const row = screen.getByTestId("row");
    expect(row.className).toContain("my-row-class");
    expect(row.className).toContain("border-b");
  });
});
