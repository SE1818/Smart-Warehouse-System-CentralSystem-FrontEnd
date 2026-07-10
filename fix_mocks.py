import os

test_dir = "src/pages/admin/__tests__"
files = ["ProductsPage.test.tsx", "ReportsPage.test.tsx", "RobotMonitorPage.test.tsx",
         "SchedulerPage.test.tsx", "StoreRegistrationsPage.test.tsx", "StoresPage.test.tsx",
         "FileManagementPage.test.tsx"]

for fname in files:
    path = os.path.join(test_dir, fname)
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines = []
    i = 0
    changed = False

    while i < len(lines):
        line = lines[i]

        # Skip standalone const mockIcon before vi.mock
        if "const mockIcon = (name: string) => () =>" in line:
            if i + 1 < len(lines) and "vi.mock('@/components/Icons'" in lines[i + 1]:
                changed = True
                i += 1
                continue

        # Fix vi.mock opening
        if "vi.mock('@/components/Icons', () => ({" in line:
            new_lines.append("vi.mock('@/components/Icons', () => {\n")
            new_lines.append(
                "  const mockIcon = (name: string) => () => "
                "<span data-testid={`icon-${name}`}>{name}Icon</span>;\n")
            new_lines.append("  return {\n")
            new_lines.append("    Icons: {\n")
            changed = True
            i += 1
            continue

        # Fix closing: "  },\n }));" -> "  },\n  });\n});"
        stripped = line.rstrip()
        if stripped == "  }," and i + 1 < len(lines) and "}));" in lines[i + 1]:
            new_lines.append(line)
            new_lines.append("  });\n")
            new_lines.append("});\n")
            i += 2
            changed = True
            continue

        new_lines.append(line)
        i += 1

    if changed:
        with open(path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        print("Fixed: " + fname)
    else:
        print("No change: " + fname)
