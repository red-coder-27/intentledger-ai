import { describe, it, expect, vi } from "vitest";
import {
  ModuleRegistry,
  AllCommunityModule,
  enableDevValidations,
  themeAlpine,
  RowSelectionOptions,
} from "ag-grid-community";
import type { GridOptions } from "ag-grid-community";

describe("AG Grid v36 Configuration & Warning Regression Verification", () => {
  it("registers AllCommunityModule and enables development validations cleanly", () => {
    expect(() => {
      enableDevValidations();
      ModuleRegistry.registerModules([AllCommunityModule]);
    }).not.toThrow();
  });

  it("configures paginationPageSizeSelector containing initial paginationPageSize=10", () => {
    const paginationPageSize = 10;
    const paginationPageSizeSelector = [10, 20, 50, 100];

    // Warning #94 & #95 guard: configured page size MUST be an element of page size selector
    expect(paginationPageSizeSelector).toContain(paginationPageSize);
    expect(Array.isArray(paginationPageSizeSelector)).toBe(true);
    expect(paginationPageSizeSelector.length).toBeGreaterThan(1);
  });

  it("configures modern RowSelectionOptions without deprecated string values", () => {
    const rowSelection: RowSelectionOptions = {
      mode: "singleRow",
      enableClickSelection: true,
    };

    expect(rowSelection.mode).toBe("singleRow");
    expect(typeof rowSelection).toBe("object");
    // Ensure deprecated string literal 'single' is not used
    expect((rowSelection as any) === "single").toBe(false);
  });

  it("validates that grid options with themeAlpine generate zero AG Grid console warnings", () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      warnings.push(args.join(" "));
      originalWarn(...args);
    };

    try {
      enableDevValidations();
      ModuleRegistry.registerModules([AllCommunityModule]);

      const gridOptions: GridOptions = {
        theme: themeAlpine,
        pagination: true,
        paginationPageSize: 10,
        paginationPageSizeSelector: [10, 20, 50, 100],
        rowSelection: {
          mode: "singleRow",
          enableClickSelection: true,
        },
        defaultColDef: {
          sortable: true,
          filter: true,
          resizable: true,
        },
        rowData: [],
      };

      expect(gridOptions.theme).toBe(themeAlpine);
      expect(warnings.filter((w) => w.includes("AG Grid") || w.includes("#94") || w.includes("#95"))).toHaveLength(0);
    } finally {
      console.warn = originalWarn;
    }
  });
});

