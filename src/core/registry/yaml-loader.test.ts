import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { loadYamlTools } from "./yaml-loader.js";

const testDir = join(tmpdir(), "cob-yaml-loader-test");

beforeEach(() => {
	mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
	rmSync(testDir, { recursive: true, force: true });
});

const validYaml = `
name: get_metafield
domain: metafields
description: Get a metafield by namespace and key
scopes:
  - read_metafields
input:
  owner_id:
    type: string
    description: GID of the resource
    required: true
  namespace:
    type: string
    required: true
  key:
    type: string
    required: true
graphql: |
  query GetMetafield($ownerId: ID!) {
    metafield(ownerId: $ownerId) { id namespace key value }
  }
`;

describe("loadYamlTools", () => {
	it("loads valid YAML tool file into ToolDefinition", () => {
		const filePath = join(testDir, "get-metafield.yaml");
		writeFileSync(filePath, validYaml);

		const tools = loadYamlTools([filePath]);
		expect(tools).toHaveLength(1);
		expect(tools[0].name).toBe("get_metafield");
		expect(tools[0].domain).toBe("metafields");
		expect(tools[0].description).toBe("Get a metafield by namespace and key");
		expect(tools[0].scopes).toEqual(["read_metafields"]);
		expect(tools[0].graphql).toContain("query GetMetafield");
	});

	it("sets tier to 3 for YAML tools", () => {
		const filePath = join(testDir, "tool.yaml");
		writeFileSync(filePath, validYaml);

		const tools = loadYamlTools([filePath]);
		expect(tools[0].tier).toBe(3);
	});

	it("converts string input type to z.string()", () => {
		const yaml = `
name: test_str
domain: test
description: Test
scopes: []
input:
  name:
    type: string
    required: true
graphql: "query { test }"
`;
		const filePath = join(testDir, "str.yaml");
		writeFileSync(filePath, yaml);

		const tools = loadYamlTools([filePath]);
		const schema = z.object(tools[0].input);
		expect(schema.safeParse({ name: "hello" }).success).toBe(true);
		expect(schema.safeParse({ name: 123 }).success).toBe(false);
	});

	it("converts number input type to z.number()", () => {
		const yaml = `
name: test_num
domain: test
description: Test
scopes: []
input:
  count:
    type: number
    required: true
graphql: "query { test }"
`;
		const filePath = join(testDir, "num.yaml");
		writeFileSync(filePath, yaml);

		const tools = loadYamlTools([filePath]);
		const schema = z.object(tools[0].input);
		expect(schema.safeParse({ count: 5 }).success).toBe(true);
		expect(schema.safeParse({ count: "five" }).success).toBe(false);
	});

	it("converts boolean input type to z.boolean()", () => {
		const yaml = `
name: test_bool
domain: test
description: Test
scopes: []
input:
  active:
    type: boolean
    required: true
graphql: "query { test }"
`;
		const filePath = join(testDir, "bool.yaml");
		writeFileSync(filePath, yaml);

		const tools = loadYamlTools([filePath]);
		const schema = z.object(tools[0].input);
		expect(schema.safeParse({ active: true }).success).toBe(true);
		expect(schema.safeParse({ active: "yes" }).success).toBe(false);
	});

	it("converts enum input type to z.enum()", () => {
		const yaml = `
name: test_enum
domain: test
description: Test
scopes: []
input:
  status:
    type: enum
    enum:
      - ACTIVE
      - DRAFT
    required: true
graphql: "query { test }"
`;
		const filePath = join(testDir, "enum.yaml");
		writeFileSync(filePath, yaml);

		const tools = loadYamlTools([filePath]);
		const schema = z.object(tools[0].input);
		expect(schema.safeParse({ status: "ACTIVE" }).success).toBe(true);
		expect(schema.safeParse({ status: "INVALID" }).success).toBe(false);
	});

	it("applies min/max constraints to number inputs", () => {
		const yaml = `
name: test_minmax
domain: test
description: Test
scopes: []
input:
  limit:
    type: number
    min: 1
    max: 100
    required: true
graphql: "query { test }"
`;
		const filePath = join(testDir, "minmax.yaml");
		writeFileSync(filePath, yaml);

		const tools = loadYamlTools([filePath]);
		const schema = z.object(tools[0].input);
		expect(schema.safeParse({ limit: 50 }).success).toBe(true);
		expect(schema.safeParse({ limit: 0 }).success).toBe(false);
		expect(schema.safeParse({ limit: 101 }).success).toBe(false);
	});

	it("applies default values to inputs", () => {
		const yaml = `
name: test_default
domain: test
description: Test
scopes: []
input:
  limit:
    type: number
    default: 10
graphql: "query { test }"
`;
		const filePath = join(testDir, "default.yaml");
		writeFileSync(filePath, yaml);

		const tools = loadYamlTools([filePath]);
		const schema = z.object(tools[0].input);
		const result = schema.parse({});
		expect(result.limit).toBe(10);
	});

	it("rejects YAML missing name field", () => {
		const yaml = `
domain: test
description: Test
scopes: []
graphql: "query { test }"
`;
		const filePath = join(testDir, "noname.yaml");
		writeFileSync(filePath, yaml);

		expect(() => loadYamlTools([filePath])).toThrow("missing required field: name");
	});

	it("rejects YAML missing graphql field", () => {
		const yaml = `
name: test_no_gql
domain: test
description: Test
scopes: []
`;
		const filePath = join(testDir, "nogql.yaml");
		writeFileSync(filePath, yaml);

		expect(() => loadYamlTools([filePath])).toThrow("missing required field: graphql");
	});

	it("loads multiple YAML files from directory", () => {
		writeFileSync(
			join(testDir, "tool1.yaml"),
			`
name: tool_one
domain: test
description: Tool one
scopes: []
input: {}
graphql: "query { one }"
`,
		);
		writeFileSync(
			join(testDir, "tool2.yml"),
			`
name: tool_two
domain: test
description: Tool two
scopes: []
input: {}
graphql: "query { two }"
`,
		);

		const tools = loadYamlTools([testDir]);
		expect(tools).toHaveLength(2);
		const names = tools.map((t) => t.name).sort();
		expect(names).toEqual(["tool_one", "tool_two"]);
	});
});
