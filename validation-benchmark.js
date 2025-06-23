const { Bench } = require("tinybench");
const { z } = require("zod");
const Joi = require("joi");
const { Validator, required, minNumber, maxNumber, stringMinLen, stringMaxLen, emailAddress, elementOf, regularExpression } = require("validant");
const yup = require("yup");
const { string, number, array, object, boolean, size, min, max, assert, pattern, enums } = require("superstruct");
const FastestValidator = require("fastest-validator");

console.log("🚀 Comprehensive Validation Library Benchmark");
console.log("=".repeat(60));
console.log(`Node.js: ${process.version}`);
console.log("Testing realistic scenarios developers face daily\n");

// ========================
// SCENARIO 1: USER REGISTRATION
// ========================

const userRegistrationData = {
    username: "john_doe_123",
    email: "john.doe@example.com",
    password: "SecurePass123!",
    age: 28,
    firstName: "John",
    lastName: "Doe",
    acceptTerms: true,
    newsletter: false
};

const userSchemas = {
    zod: z.object({
        username: z.string().min(3).max(20),
        email: z.string().email(),
        password: z.string().min(8),
        age: z.number().min(13).max(120),
        firstName: z.string().min(1).max(50),
        lastName: z.string().min(1).max(50),
        acceptTerms: z.boolean(),
        newsletter: z.boolean()
    }),

    joi: Joi.object({
        username: Joi.string().min(3).max(20).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        age: Joi.number().integer().min(13).max(120).required(),
        firstName: Joi.string().min(1).max(50).required(),
        lastName: Joi.string().min(1).max(50).required(),
        acceptTerms: Joi.boolean().required(),
        newsletter: Joi.boolean().required()
    }),

    validant: {
        username: [required(), stringMinLen(3), stringMaxLen(20)],
        email: [required(), emailAddress()],
        password: [required(), stringMinLen(8)],
        age: [required(), minNumber(13), maxNumber(120)],
        firstName: [required(), stringMinLen(1), stringMaxLen(50)],
        lastName: [required(), stringMinLen(1), stringMaxLen(50)],
        acceptTerms: [required()],
        newsletter: [required()]
    },

    yup: yup.object({
        username: yup.string().min(3).max(20).required(),
        email: yup.string().email().required(),
        password: yup.string().min(8).required(),
        age: yup.number().integer().min(13).max(120).required(),
        firstName: yup.string().min(1).max(50).required(),
        lastName: yup.string().min(1).max(50).required(),
        acceptTerms: yup.boolean().required(),
        newsletter: yup.boolean().required()
    }),

    superstruct: object({
        username: size(string(), 3, 20),
        email: pattern(string(), /^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        password: size(string(), 8, 100),
        age: min(max(number(), 120), 13),
        firstName: size(string(), 1, 50),
        lastName: size(string(), 1, 50),
        acceptTerms: boolean(),
        newsletter: boolean()
    }),

    "fastest-validator": new FastestValidator().compile({
        username: { type: "string", min: 3, max: 20 },
        email: { type: "email" },
        password: { type: "string", min: 8 },
        age: { type: "number", integer: true, min: 13, max: 120 },
        firstName: { type: "string", min: 1, max: 50 },
        lastName: { type: "string", min: 1, max: 50 },
        acceptTerms: { type: "boolean" },
        newsletter: { type: "boolean" }
    })
};

// ========================
// SCENARIO 2: API PAYLOAD
// ========================

const apiPayloadData = {
    userId: "user_12345",
    action: "update_profile",
    data: {
        profile: {
            bio: "Software developer passionate about clean code",
            location: "San Francisco, CA",
            website: "https://johndoe.dev"
        },
        preferences: {
            theme: "dark",
            notifications: true,
            language: "en"
        }
    },
    timestamp: "2024-06-23T15:30:00Z",
    version: "1.2.0"
};

const apiSchemas = {
    zod: z.object({
        userId: z.string(),
        action: z.string(),
        data: z.object({
            profile: z.object({
                bio: z.string().max(500),
                location: z.string().max(100),
                website: z.string().url()
            }),
            preferences: z.object({
                theme: z.enum(["light", "dark", "auto"]),
                notifications: z.boolean(),
                language: z.string().length(2)
            })
        }),
        timestamp: z.string(),
        version: z.string()
    }),

    joi: Joi.object({
        userId: Joi.string().required(),
        action: Joi.string().required(),
        data: Joi.object({
            profile: Joi.object({
                bio: Joi.string().max(500).required(),
                location: Joi.string().max(100).required(),
                website: Joi.string().uri().required()
            }).required(),
            preferences: Joi.object({
                theme: Joi.string().valid("light", "dark", "auto").required(),
                notifications: Joi.boolean().required(),
                language: Joi.string().length(2).required()
            }).required()
        }).required(),
        timestamp: Joi.string().required(),
        version: Joi.string().required()
    }),

    validant: {
        userId: [required()],
        action: [required()],
        data: {
            profile: {
                bio: [required(), stringMaxLen(500)],
                location: [required(), stringMaxLen(100)],
                website: [required(), regularExpression(/^https?:\/\/.+/)]
            },
            preferences: {
                theme: [required(), elementOf(["light", "dark", "auto"])],
                notifications: [required()],
                language: [required(), stringMinLen(2), stringMaxLen(2)]
            }
        },
        timestamp: [required()],
        version: [required()]
    },

    yup: yup.object({
        userId: yup.string().required(),
        action: yup.string().required(),
        data: yup.object({
            profile: yup.object({
                bio: yup.string().max(500).required(),
                location: yup.string().max(100).required(),
                website: yup.string().url().required()
            }).required(),
            preferences: yup.object({
                theme: yup.string().oneOf(["light", "dark", "auto"]).required(),
                notifications: yup.boolean().required(),
                language: yup.string().length(2).required()
            }).required()
        }).required(),
        timestamp: yup.string().required(),
        version: yup.string().required()
    }),

    superstruct: object({
        userId: string(),
        action: string(),
        data: object({
            profile: object({
                bio: size(string(), 0, 500),
                location: size(string(), 0, 100),
                website: pattern(string(), /^https?:\/\/.+/)
            }),
            preferences: object({
                theme: enums(["light", "dark", "auto"]),
                notifications: boolean(),
                language: size(string(), 2, 2)
            })
        }),
        timestamp: string(),
        version: string()
    }),

    "fastest-validator": new FastestValidator().compile({
        userId: { type: "string" },
        action: { type: "string" },
        data: {
            type: "object",
            props: {
                profile: {
                    type: "object",
                    props: {
                        bio: { type: "string", max: 500 },
                        location: { type: "string", max: 100 },
                        website: { type: "url" }
                    }
                },
                preferences: {
                    type: "object",
                    props: {
                        theme: { type: "enum", values: ["light", "dark", "auto"] },
                        notifications: { type: "boolean" },
                        language: { type: "string", length: 2 }
                    }
                }
            }
        },
        timestamp: { type: "string" },
        version: { type: "string" }
    })
};

// ========================
// SCENARIO 3: BULK PROCESSING
// ========================

const generateBulkData = (count) => {
    return Array.from({ length: count }, (_, i) => ({
        id: `item_${i + 1}`,
        value: Math.random() * 1000,
        category: ["A", "B", "C", "D"][i % 4],
        active: Math.random() > 0.5,
        priority: Math.floor(Math.random() * 5) + 1
    }));
};

const bulkData = generateBulkData(50);

const bulkSchemas = {
    zod: z.array(z.object({
        id: z.string(),
        value: z.number(),
        category: z.enum(["A", "B", "C", "D"]),
        active: z.boolean(),
        priority: z.number().int().min(1).max(5)
    })),

    joi: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        value: Joi.number().required(),
        category: Joi.string().valid("A", "B", "C", "D").required(),
        active: Joi.boolean().required(),
        priority: Joi.number().integer().min(1).max(5).required()
    })),

    validant: [{
        id: [required()],
        value: [required()],
        category: [required(), elementOf(["A", "B", "C", "D"])],
        active: [required()],
        priority: [required(), minNumber(1), maxNumber(5)]
    }],

    yup: yup.array().of(yup.object({
        id: yup.string().required(),
        value: yup.number().required(),
        category: yup.string().oneOf(["A", "B", "C", "D"]).required(),
        active: yup.boolean().required(),
        priority: yup.number().integer().min(1).max(5).required()
    })),

    superstruct: array(object({
        id: string(),
        value: number(),
        category: enums(["A", "B", "C", "D"]),
        active: boolean(),
        priority: min(max(number(), 5), 1)
    })),

    "fastest-validator": new FastestValidator().compile({
        type: "array",
        items: {
            type: "object",
            props: {
                id: { type: "string" },
                value: { type: "number" },
                category: { type: "enum", values: ["A", "B", "C", "D"] },
                active: { type: "boolean" },
                priority: { type: "number", integer: true, min: 1, max: 5 }
            }
        }
    })
};

// ========================
// VALIDATION FUNCTION
// ========================

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
                if (Array.isArray(schema)) {
                    const validator = new Validator(schema[0]);
                    for (const item of data) {
                        const result = validator.validate(item);
                        if (!result.isValid) throw new Error(result.message);
                    }
                    return data;
                } else {
                    const validator = new Validator(schema);
                    const result = validator.validate(data);
                    if (!result.isValid) throw new Error(result.message);
                    return data;
                }
            case "yup":
                return schema.validateSync(data);
            case "superstruct":
                assert(data, schema);
                return data;
            case "fastest-validator":
                const validationResult = schema(data);
                if (validationResult !== true) throw new Error("Validation failed");
                return data;
            default:
                throw new Error(`Unknown library: ${library}`);
        }
    } catch (error) {
        return null;
    }
}

// ========================
// BENCHMARK RUNNER
// ========================

async function runBenchmark(name, schemas, data, description) {
    console.log(`\n🎯 ${name}`);
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
                if (result !== null) {
                    workingLibraries.push(lib);
                    console.log(`✅ ${lib}`);
                } else {
                    console.log(`❌ ${lib} - validation failed`);
                }
            } catch (error) {
                console.log(`❌ ${lib} - error: ${error.message}`);
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
}

// ========================
// MAIN EXECUTION
// ========================

(async () => {
    try {
        await runBenchmark(
            "User Registration Form",
            userSchemas,
            userRegistrationData,
            "Typical user signup form with email, password, and profile fields"
        );

        await runBenchmark(
            "API Request Payload",
            apiSchemas,
            apiPayloadData,
            "Complex nested API payload with multiple object levels"
        );

        await runBenchmark(
            "Bulk Data Processing",
            bulkSchemas,
            bulkData,
            "Array of 50 objects - simulates batch processing scenarios"
        ); 

    } catch (error) {
        console.error("❌ Benchmark failed:", error);
        process.exit(1);
    }
})(); 