/**
 * Simple Person Validation Benchmark
 * 
 * This benchmark tests the absolute minimum validation scenario:
 * - Single object with one field
 * - Only "required" rule applied
 * - Tests pure validation library overhead
 * 
 * This represents the baseline performance all libraries should achieve
 * for the simplest possible validation case.
 */

const { Bench } = require("tinybench");
const { z } = require("zod");
const Joi = require("joi");
const { Validator, required } = require("validant");
const yup = require("yup");
const { string, object, assert } = require("superstruct");
const FastestValidator = require("fastest-validator");

console.log("🚀 Simple Person Validation Benchmark");
console.log("=".repeat(60));
console.log(`Node.js: ${process.version}`);
console.log("Testing minimal validation: person { name: string (required) }\n");

// =============================================================================
// TEST DATA
// =============================================================================

const validPersonData = {
    name: "John Doe"
};

const invalidPersonData = {
    name: ""
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const schemas = {
    zod: z.object({
        name: z.string().min(1)
    }),

    joi: Joi.object({
        name: Joi.string().required()
    }),

    validant: {
        name: [required('Name is required')]
    },

    yup: yup.object({
        name: yup.string().required()
    }),

    superstruct: object({
        name: string()
    }),

    "fastest-validator": new FastestValidator().compile({
        name: { type: "string", empty: false }
    })
};

// =============================================================================
// VALIDATION FUNCTION
// =============================================================================

function validateWith(library, schema, data) {
    try {
        switch (library) {
            case "zod":
                return schema.parse(data);
            case "joi":
                const result = schema.validate(data);
                if (result.error) throw result.error;
                return result.value;
            case "validant":
                const validator = new Validator();
                const validantResult = validator.validate(data, schema);
                if (!validantResult.isValid) throw new Error(validantResult.message);
                return data;
            case "yup":
                return schema.validateSync(data);
            case "superstruct":
                assert(data, schema);
                return data;
            case "fastest-validator":
                const validationCheck = schema(data);
                if (validationCheck !== true) throw new Error("Validation failed");
                return data;
            default:
                throw new Error(`Unknown library: ${library}`);
        }
    } catch (error) {
        return null;
    }
}

// =============================================================================
// BENCHMARK RUNNER
// =============================================================================

async function runBenchmark(testName, data, description, expectFailure = false) {
    console.log(`\n🎯 ${testName}`);
    console.log(`${description}`);
    console.log("─".repeat(60));

    const bench = new Bench({ time: 2000 });
    const libraries = ["fastest-validator", "zod", "joi", "validant", "yup", "superstruct"];

    console.log("Testing library compatibility...");
    const workingLibraries = [];

    for (const lib of libraries) {
        if (schemas[lib]) {
            try {
                const result = validateWith(lib, schemas[lib], data);
                if (!expectFailure && result !== null) {
                    workingLibraries.push(lib);
                    console.log(`✅ ${lib} - validation passed`);
                } else if (expectFailure && result === null) {
                    workingLibraries.push(lib);
                    console.log(`✅ ${lib} - validation failed as expected`);
                } else if (expectFailure && result !== null) {
                    console.log(`❌ ${lib} - should have failed but passed`);
                } else {
                    console.log(`❌ ${lib} - unexpected result`);
                }
            } catch (error) {
                if (expectFailure) {
                    workingLibraries.push(lib);
                    console.log(`✅ ${lib} - threw error as expected`);
                } else {
                    console.log(`❌ ${lib} - error: ${error.message}`);
                }
            }
        } else {
            console.log(`❌ ${lib} - no schema defined`);
        }
    }

    if (workingLibraries.length === 0) {
        console.log("❌ No working libraries found");
        return;
    }

    workingLibraries.forEach(lib => {
        bench.add(lib, () => {
            validateWith(lib, schemas[lib], data);
        });
    });

    await bench.run();

    console.log("\n📊 Performance Results:");
    bench.tasks
        .sort((a, b) => b.result.hz - a.result.hz)
        .forEach((task, index) => {
            const opsPerSec = Math.round(task.result.hz).toLocaleString();
            const rme = task.result.rme.toFixed(2);
            const emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
            console.log(`${emoji} ${task.name.padEnd(18)}: ${opsPerSec.padStart(12)} ops/sec ±${rme}%`);
        });

    // Calculate relative performance
    const fastest = bench.tasks.sort((a, b) => b.result.hz - a.result.hz)[0];
    const slowest = bench.tasks.sort((a, b) => a.result.hz - b.result.hz)[0];
    const speedDifference = (fastest.result.hz / slowest.result.hz).toFixed(1);

    console.log(`\n🏆 Winner: ${fastest.name} (${speedDifference}x faster than slowest)`);
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

(async () => {
    try {
        await runBenchmark(
            "Valid Person Data",
            validPersonData,
            "Testing successful validation of: { name: 'John Doe' }"
        );

        await runBenchmark(
            "Invalid Person Data",
            invalidPersonData,
            "Testing validation failure of: { name: '' }",
            true
        );

        console.log("\n" + "=".repeat(60));
        console.log("🎯 Simple Person Benchmark Complete!");
        console.log("\nKey Insights:");
        console.log("• This represents the absolute minimum validation overhead");
        console.log("• Performance differences show library baseline costs");
        console.log("• Real-world scenarios will have additional complexity");
        console.log("• Consider this the 'speed of light' for each library");
        console.log("=".repeat(60));

    } catch (error) {
        console.error("❌ Benchmark failed:", error);
        process.exit(1);
    }
})(); 