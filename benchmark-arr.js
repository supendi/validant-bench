const { Bench } = require("tinybench");
const { z } = require("zod");
const Joi = require("joi");
const { validant, required } = require("validant");
const yup = require("yup");
const { string, number, array, object } = require("superstruct");
const FastestValidator = require("fastest-validator");

// ========================
// 1. Generate Test Data (500 records, 3 levels deep)
// ========================
const generateData = (depth = 0) => ({
    id: `id-${Math.random().toString(36).slice(2)}`,
    value: Math.floor(Math.random() * 100),
    children:
        depth < 3
            ? Array(3)
                  .fill(null)
                  .map(() => generateData(depth + 1))
            : [],
});

const testData = Array(500)
    .fill(null)
    .map(() => generateData());

// ========================
// 2. Define Validators
// ========================

// validant
const validantRule = {
    id: [required()],
    value: [required()],
    children: {
        arrayItemRule: {
            id: [required()],
            value: [required()],
            children: {
                arrayItemRule: {
                    id: [required()],
                    value: [required()],
                    children: {
                        arrayItemRule: {
                            id: [required()],
                            value: [required()],
                            children: {
                                arrayItemRule: {
                                    id: [required()],
                                    value: [required()],
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};

// Zod
const zodSchema = z.object({
    id: z.string(),
    value: z.number(),
    children: z.array(
        z.object({
            id: z.string(),
            value: z.number(),
            children: z.array(
                z.object({
                    id: z.string(),
                    value: z.number(),
                    children: z.array(
                        z.object({
                            id: z.string(),
                            value: z.number(),
                            children: z.array(
                                z.object({
                                    id: z.string(),
                                    value: z.number(),
                                })
                            ),
                        })
                    ),
                })
            ),
        })
    ),
});

// Joi
const joiSchema = Joi.object({
    id: Joi.string().required(),
    value: Joi.number().required(),
    children: Joi.array().items(
        Joi.object({
            id: Joi.string().required(),
            value: Joi.number().required(),
            children: Joi.array().items(
                Joi.object({
                    id: Joi.string().required(),
                    value: Joi.number().required(),
                    children: Joi.array().items(
                        Joi.object({
                            id: Joi.string().required(),
                            value: Joi.number().required(),
                            children: Joi.array().items(
                                Joi.object({
                                    id: Joi.string().required(),
                                    value: Joi.number().required(),
                                })
                            ),
                        })
                    ),
                })
            ),
        })
    ),
});

// Yup
const yupSchema = yup.object({
    id: yup.string().required(),
    value: yup.number().required(),
    children: yup.array().of(
        yup.object({
            id: yup.string().required(),
            value: yup.number().required(),
            children: yup.array().of(
                yup.object({
                    id: yup.string().required(),
                    value: yup.number().required(),
                    children: yup.array().of(
                        yup.object({
                            id: yup.string().required(),
                            value: yup.number().required(),
                            children: yup.array().of(
                                yup.object({
                                    id: yup.string().required(),
                                    value: yup.number().required(),
                                })
                            ),
                        })
                    ),
                })
            ),
        })
    ),
});

// Superstruct

// Superstruct (Non-recursive to match depth)
const SuperstructLevel4 = object({
    id: string(),
    value: number(),
});

const SuperstructLevel3 = object({
    id: string(),
    value: number(),
    children: array(SuperstructLevel4),
});

const SuperstructLevel2 = object({
    id: string(),
    value: number(),
    children: array(SuperstructLevel3),
});

const SuperstructSchema = object({
    id: string(),
    value: number(),
    children: array(SuperstructLevel2),
});

// Fastest Validator
const fv = new FastestValidator();
const fastestValidatorSchema = {
    id: { type: "string" },
    value: { type: "number" },
    children: {
        type: "array",
        items: {
            type: "object",
            props: {
                id: { type: "string" },
                value: { type: "number" },
                children: {
                    type: "array",
                    items: {
                        type: "object",
                        props: {
                            id: { type: "string" },
                            value: { type: "number" },
                            children: {
                                type: "array",
                                items: {
                                    type: "object",
                                    props: {
                                        id: { type: "string" },
                                        value: { type: "number" },
                                        children: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                props: {
                                                    id: { type: "string" },
                                                    value: { type: "number" },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
const fastestValidatorCompiled = fv.compile(fastestValidatorSchema);

// ========================
// 3. Run Benchmarks
// ========================

const bench = new Bench();

function runValidation(validator, data) {
    for (const item of data) {
        try {
            switch (validator) {
                case "validant":
                    validant.validate(validantRule, item);
                    break;
                case "zod":
                    zodSchema.parse(item);
                    break;
                case "joi":
                    joiSchema.validate(item, { abortEarly: false });
                    break;
                case "yup":
                    yupSchema.validateSync(item);
                    break;
                case "superstruct":
                    SuperstructSchema(item);
                    break;
                case "fastest-validator":
                    fastestValidatorCompiled(item);
                    break;
            }
        } catch (_) {}
    }
}

bench
    .add("validant", () => runValidation("validant", testData))
    .add("Zod", () => runValidation("zod", testData))
    .add("Joi", () => runValidation("joi", testData))
    .add("Yup", () => runValidation("yup", testData))
    .add("Superstruct", () => runValidation("superstruct", testData))
    .add("fastest-validator", () =>
        runValidation("fastest-validator", testData)
    );

// ========================
// 4. Run Benchmark
// ========================

(async () => {
    console.log("Warming up...");
    runValidation("validant", testData.slice(0, 10));
    runValidation("zod", testData.slice(0, 10));
    runValidation("joi", testData.slice(0, 10));
    runValidation("yup", testData.slice(0, 10));
    runValidation("superstruct", testData.slice(0, 10));
    runValidation("fastest-validator", testData.slice(0, 10));

    console.log("Running benchmark...\n");
    await bench.run();

    bench.tasks
        .sort((a, b) => b.result.hz - a.result.hz)
        .forEach((task) => {
            console.log(
                `${task.name.padEnd(25)}: ${Math.round(
                    task.result.hz
                ).toLocaleString()} ops/sec ±${task.result.rme.toFixed(2)}%`
            );
        });
})();
