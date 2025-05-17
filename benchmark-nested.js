const { Bench } = require("tinybench");
const { z } = require("zod");
const Joi = require("joi");
const yup = require("yup");
const FastestValidator = require("fastest-validator");
const { string, number, define, size, min } = require("superstruct");
const { validant, minNumber, stringMinLen } = require("validant");

// 1. Simplified Test Data (single object, no arrays)
const testData = {
    id: "test123",
    value: 42,
    child: {
        id: "child1",
        value: 10,
        child: {
            id: "child2",
            value: 5,
            child: {
                id: "child3",
                value: 1,
            },
        },
    },
};

// 2. Optimized Fastest Validator Setup
const fv = new FastestValidator({
    defaults: {
        object: {
            strict: true,
        },
    },
});

const fastestSchema = {
    id: { type: "string", min: 1 },
    value: { type: "number", min: 1 },
    child: {
        type: "object",
        props: {
            id: { type: "string", min: 1 },
            value: { type: "number", min: 1 },
            child: {
                type: "object",
                props: {
                    id: { type: "string", min: 1 },
                    value: { type: "number", min: 1 },
                    child: {
                        type: "object",
                        props: {
                            id: { type: "string", min: 1 },
                            value: { type: "number", min: 1 },
                        },
                    },
                },
            },
        },
    },
};
const fastestCompiled = fv.compile(fastestSchema);

// 3. Other Validators (simplified)
const zodSchema = z.object({
    id: z.string().min(1),
    value: z.number().min(1),
    child: z.object({
        id: z.string().min(1),
        value: z.number().min(1),
        child: z.object({
            id: z.string().min(1),
            value: z.number().min(1),
            child: z.object({
                id: z.string().min(1),
                value: z.number().min(1),
            }),
        }),
    }),
});
const nonEmptyString = size(string(), 1, Infinity); // Min length 1, no max limit

const superstructSchema = define({
    id: nonEmptyString,
    value: min(number(), 1),
    child: define({
        id: nonEmptyString,
        value: min(number(), 1),
        child: define({
            id: nonEmptyString,
            value: min(number(), 1),
            child: define({
                id: nonEmptyString,
                value: min(number(), 1),
            }),
        }),
    }),
});

const joiSchema = Joi.object({
    id: Joi.string().required(),
    value: Joi.number().required(),
    child: Joi.object({
        id: Joi.string().required(),
        value: Joi.number().required(),
        child: Joi.object({
            id: Joi.string().required(),
            value: Joi.number().required(),
            child: Joi.object({
                id: Joi.string().required(),
                value: Joi.number().required(),
            }),
        }),
    }),
});

const yupSchema = yup.object({
    id: yup.string().required(),
    value: yup.number().required(),
    child: yup.object({
        id: yup.string().required(),
        value: yup.number().required(),
        child: yup.object({
            id: yup.string().required(),
            value: yup.number().required(),
            child: yup.object({
                id: yup.string().required(),
                value: yup.number().required(),
            }),
        }),
    }),
});

const validantRule = {
    id: [stringMinLen(1)],
    value: [minNumber(1)],
    child: {
        id: [stringMinLen(1)],
        value: [minNumber(1)],
        child: {
            id: [stringMinLen(1)],
            value: [minNumber(1)],
            child: {
                id: [stringMinLen(1)],
                value: [minNumber(1)],
            },
        },
    },
};

// 4. Benchmark Setup
const bench = new Bench({ time: 1000 });

bench
    .add("Fastest Validator", () => {
        fastestCompiled(testData);
    })
    .add("Validant", () => {
        validant.validate(testData, validantRule);
    })
    .add("Zod", () => {
        zodSchema.parse(testData);
    })
    .add("Superstruct", () => {
        superstructSchema.validate(testData);
    })
    .add("Joi", () => {
        joiSchema.validate(testData);
    })
    .add("Yup", () => {
        yupSchema.validate(testData);
    });

// 5. Run Benchmark
(async () => {
    await bench.run();

    console.log("\nValidation Performance:");
    bench.tasks
        .sort((a, b) => b.result.hz - a.result.hz)
        .forEach((task) => {
            console.log(
                `${task.name.padEnd(20)}: ${Math.round(
                    task.result.hz
                ).toLocaleString()} ops/sec`
            );
        });
})();
