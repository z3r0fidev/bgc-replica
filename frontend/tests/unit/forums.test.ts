import { describe, it, expect } from "vitest";

// Interface for testing tree logic
interface ForumCategoryTree {
  id: string;
  name: string;
  parent_id: string | null;
  children: ForumCategoryTree[];
}

interface FlatCategory {
  id: string;
  name: string;
  parent_id: string | null;
}

const buildTree = (categories: FlatCategory[]): ForumCategoryTree[] => {
  const categoryMap: Record<string, ForumCategoryTree> = {};
  categories.forEach(cat => {
    categoryMap[cat.id] = { ...cat, children: [] };
  });

  const tree: ForumCategoryTree[] = [];
  categories.forEach(cat => {
    if (cat.parent_id) {
      const parent = categoryMap[cat.parent_id];
      if (parent) {
        parent.children.push(categoryMap[cat.id]);
      }
    } else {
      tree.push(categoryMap[cat.id]);
    }
  });
  return tree;
};

describe("Forum Tree Logic", () => {
  it("builds a nested tree from flat categories", () => {
    const flat = [
      { id: "1", name: "Parent", parent_id: null },
      { id: "2", name: "Child 1", parent_id: "1" },
      { id: "3", name: "Child 2", parent_id: "1" },
      { id: "4", name: "Grandchild", parent_id: "2" },
    ];

    const tree = buildTree(flat);

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("Parent");
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].name).toBe("Grandchild");
  });

  it("handles orphaned children gracefully", () => {
    const flat = [
      { id: "2", name: "Child 1", parent_id: "non-existent" },
    ];
    const tree = buildTree(flat);
    expect(tree).toHaveLength(0);
  });
});
