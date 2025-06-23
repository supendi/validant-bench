const Benchmark = require('benchmark');

// Library imports
const z = require('zod');
const Joi = require('joi');
const yup = require('yup');
const { string, number, integer, array, object, boolean, size, min, max, assert, pattern, enums } = require("superstruct");
const { AsyncValidator, AsyncValidationRule, required, minNumber, maxNumber, emailAddress, isString, isNumber, elementOf, arrayMinLen, arrayMaxLen, stringMinLen, stringMaxLen } = require("validant");

// =============================================================================
// MOCK ASYNC SERVICES (Simulating real-world API calls)
// =============================================================================

const mockDatabase = {
    existingEmails: new Set(['admin@company.com', 'user@taken.com', 'test@exists.com']),
    existingUsernames: new Set(['admin', 'root', 'test', 'user123']),
    validCompanyDomains: new Set(['company.com', 'enterprise.org', 'business.net']),
    blockedIPs: new Set(['192.168.1.100', '10.0.0.50', '172.16.0.25'])
};

// Mock async services with realistic delays
const asyncServices = {
    // Simulate checking if email exists in database (10-15ms delay)
    async checkEmailExists(email) {
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 5));
        return mockDatabase.existingEmails.has(email);
    },

    // Simulate username availability check (15-20ms delay)
    async checkUsernameAvailable(username) {
        await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 5));
        return !mockDatabase.existingUsernames.has(username.toLowerCase());
    },

    // Simulate company domain validation (20-25ms delay)
    async validateCompanyDomain(email) {
        await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 5));
        if (!email.includes('@')) return false;
        const domain = email.split('@')[1];
        return mockDatabase.validCompanyDomains.has(domain);
    },

    // Simulate IP blacklist check (5-10ms delay)
    async checkIPNotBlocked(ip) {
        await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 5));
        return !mockDatabase.blockedIPs.has(ip);
    },

    // Simulate credit card validation service (30-40ms delay)
    async validateCreditCard(cardNumber) {
        await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 10));
        // Simple Luhn algorithm check
        const digits = cardNumber.replace(/\D/g, '');
        if (digits.length !== 16) return false;
        
        let sum = 0;
        for (let i = digits.length - 1; i >= 0; i--) {
            let digit = parseInt(digits[i]);
            if ((digits.length - i) % 2 === 0) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
        }
        return sum % 10 === 0;
    }
};

//=============================================================================
// TEST DATA
//=============================================================================

// Scenario 1: User Registration with Async Checks
const userRegistrationData = {
    username: "newuser2024",
    email: "newuser@company.com", 
    password: "SecurePass123!",
    confirmPassword: "SecurePass123!",
    age: 28,
    acceptTerms: true,
    ipAddress: "192.168.1.10"
};

// Scenario 2: Payment Processing with Async Validation
const paymentData = {
    cardNumber: "4532015112830366", // Valid test card
    expiryMonth: 12,
    expiryYear: 2025,
    cvv: "123",
    amount: 299.99,
    currency: "USD",
    merchantEmail: "merchant@business.net",
    customerIP: "203.0.113.15"
};

// Scenario 3: Bulk User Import with Async Validation
const bulkUserData = Array.from({ length: 10 }, (_, i) => ({
    id: `user_${i + 1}`,
    username: `bulkuser${i + 1}`,
    email: i < 2 ? `user${i}@taken.com` : `newuser${i}@company.com`, // First 2 will fail
    department: i % 4 === 0 ? "IT" : i % 4 === 1 ? "HR" : i % 4 === 2 ? "Finance" : "Marketing",
    role: i % 3 === 0 ? "admin" : i % 3 === 1 ? "user" : "viewer",
    active: i % 5 !== 0 // Every 5th user is inactive
}));

// Wrapped bulk data for validant (needs object wrapper)
const bulkUserDataWrapped = { users: bulkUserData };

// =============================================================================
// ZOD ASYNC SCHEMAS
// =============================================================================

const zodAsyncSchemas = {
    userRegistration: z.object({
        username: z.string().min(3).max(20)
            .refine(async (username) => await asyncServices.checkUsernameAvailable(username), {
                message: "Username is already taken"
            }),
        email: z.string().email()
            .refine(async (email) => !(await asyncServices.checkEmailExists(email)), {
                message: "Email already exists"
            })
            .refine(async (email) => await asyncServices.validateCompanyDomain(email), {
                message: "Must use company email domain"
            }),
        password: z.string().min(8).max(100),
        confirmPassword: z.string(),
        age: z.number().int().min(18).max(120),
        acceptTerms: z.boolean().refine(val => val === true, {
            message: "Must accept terms"
        }),
        ipAddress: z.string()
            .refine(async (ip) => await asyncServices.checkIPNotBlocked(ip), {
                message: "IP address is blocked"
            })
    }).refine(data => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"]
    }),

    payment: z.object({
        cardNumber: z.string()
            .refine(async (card) => await asyncServices.validateCreditCard(card), {
                message: "Invalid credit card number"
            }),
        expiryMonth: z.number().int().min(1).max(12),
        expiryYear: z.number().int().min(2024).max(2030),
        cvv: z.string().length(3),
        amount: z.number().min(0.01).max(10000),
        currency: z.enum(["USD", "EUR", "GBP"]),
        merchantEmail: z.string().email()
            .refine(async (email) => await asyncServices.validateCompanyDomain(email), {
                message: "Invalid merchant domain"
            }),
        customerIP: z.string()
            .refine(async (ip) => await asyncServices.checkIPNotBlocked(ip), {
                message: "Customer IP is blocked"
            })
    }),

    bulkUsers: z.array(z.object({
        id: z.string(),
        username: z.string().min(3).max(20)
            .refine(async (username) => await asyncServices.checkUsernameAvailable(username), {
                message: "Username taken"
            }),
        email: z.string().email()
            .refine(async (email) => !(await asyncServices.checkEmailExists(email)), {
                message: "Email exists"
            }),
        department: z.enum(["IT", "HR", "Finance", "Marketing"]),
        role: z.enum(["admin", "user", "viewer"]),
        active: z.boolean()
    }))
};

// =============================================================================
// JOI ASYNC SCHEMAS
// =============================================================================

const joiAsyncSchemas = {
    userRegistration: Joi.object({
        username: Joi.string().min(3).max(20).required()
            .external(async (username) => {
                const available = await asyncServices.checkUsernameAvailable(username);
                if (!available) throw new Error("Username is already taken");
                return username;
            }),
        email: Joi.string().email().required()
            .external(async (email) => {
                const exists = await asyncServices.checkEmailExists(email);
                if (exists) throw new Error("Email already exists");
                
                const validDomain = await asyncServices.validateCompanyDomain(email);
                if (!validDomain) throw new Error("Must use company email domain");
                
                return email;
            }),
        password: Joi.string().min(8).max(100).required(),
        confirmPassword: Joi.string().required().valid(Joi.ref('password')),
        age: Joi.number().integer().min(18).max(120).required(),
        acceptTerms: Joi.boolean().valid(true).required(),
        ipAddress: Joi.string().required()
            .external(async (ip) => {
                const notBlocked = await asyncServices.checkIPNotBlocked(ip);
                if (!notBlocked) throw new Error("IP address is blocked");
                return ip;
            })
    }),

    payment: Joi.object({
        cardNumber: Joi.string().required()
            .external(async (card) => {
                const valid = await asyncServices.validateCreditCard(card);
                if (!valid) throw new Error("Invalid credit card number");
                return card;
            }),
        expiryMonth: Joi.number().integer().min(1).max(12).required(),
        expiryYear: Joi.number().integer().min(2024).max(2030).required(),
        cvv: Joi.string().length(3).required(),
        amount: Joi.number().min(0.01).max(10000).required(),
        currency: Joi.string().valid("USD", "EUR", "GBP").required(),
        merchantEmail: Joi.string().email().required()
            .external(async (email) => {
                const validDomain = await asyncServices.validateCompanyDomain(email);
                if (!validDomain) throw new Error("Invalid merchant domain");
                return email;
            }),
        customerIP: Joi.string().required()
            .external(async (ip) => {
                const notBlocked = await asyncServices.checkIPNotBlocked(ip);
                if (!notBlocked) throw new Error("Customer IP is blocked");
                return ip;
            })
    }),

    bulkUsers: Joi.array().items(
        Joi.object({
            id: Joi.string().required(),
            username: Joi.string().min(3).max(20).required()
                .external(async (username) => {
                    const available = await asyncServices.checkUsernameAvailable(username);
                    if (!available) throw new Error("Username taken");
                    return username;
                }),
            email: Joi.string().email().required()
                .external(async (email) => {
                    const exists = await asyncServices.checkEmailExists(email);
                    if (exists) throw new Error("Email exists");
                    return email;
                }),
            department: Joi.string().valid("IT", "HR", "Finance", "Marketing").required(),
            role: Joi.string().valid("admin", "user", "viewer").required(),
            active: Joi.boolean().required()
        })
    )
};

// =============================================================================
// YUP ASYNC SCHEMAS  
// =============================================================================

const yupAsyncSchemas = {
    userRegistration: yup.object({
        username: yup.string().min(3).max(20).required()
            .test('username-available', 'Username is already taken', 
                async (username) => await asyncServices.checkUsernameAvailable(username)),
        email: yup.string().email().required()
            .test('email-unique', 'Email already exists',
                async (email) => !(await asyncServices.checkEmailExists(email)))
            .test('company-domain', 'Must use company email domain',
                async (email) => await asyncServices.validateCompanyDomain(email)),
        password: yup.string().min(8).max(100).required(),
        confirmPassword: yup.string().required()
            .oneOf([yup.ref('password')], 'Passwords don\'t match'),
        age: yup.number().integer().min(18).max(120).required(),
        acceptTerms: yup.boolean().oneOf([true], 'Must accept terms').required(),
        ipAddress: yup.string().required()
            .test('ip-not-blocked', 'IP address is blocked',
                async (ip) => await asyncServices.checkIPNotBlocked(ip))
    }),

    payment: yup.object({
        cardNumber: yup.string().required()
            .test('card-valid', 'Invalid credit card number',
                async (card) => await asyncServices.validateCreditCard(card)),
        expiryMonth: yup.number().integer().min(1).max(12).required(),
        expiryYear: yup.number().integer().min(2024).max(2030).required(),
        cvv: yup.string().length(3).required(),
        amount: yup.number().min(0.01).max(10000).required(),
        currency: yup.string().oneOf(["USD", "EUR", "GBP"]).required(),
        merchantEmail: yup.string().email().required()
            .test('merchant-domain', 'Invalid merchant domain',
                async (email) => await asyncServices.validateCompanyDomain(email)),
        customerIP: yup.string().required()
            .test('customer-ip', 'Customer IP is blocked',
                async (ip) => await asyncServices.checkIPNotBlocked(ip))
    }),

    bulkUsers: yup.array().of(
        yup.object({
            id: yup.string().required(),
            username: yup.string().min(3).max(20).required()
                .test('username-available', 'Username taken',
                    async (username) => await asyncServices.checkUsernameAvailable(username)),
            email: yup.string().email().required()
                .test('email-unique', 'Email exists',
                    async (email) => !(await asyncServices.checkEmailExists(email))),
            department: yup.string().oneOf(["IT", "HR", "Finance", "Marketing"]).required(),
            role: yup.string().oneOf(["admin", "user", "viewer"]).required(),
            active: yup.boolean().required()
        })
    )
};

// =============================================================================
// SUPERSTRUCT ASYNC SCHEMAS
// =============================================================================

// Superstruct async validation helpers
const asyncValidators = {
    usernameAvailable: async (username) => {
        const available = await asyncServices.checkUsernameAvailable(username);
        return available || 'Username is already taken';
    },
    emailUnique: async (email) => {
        const exists = await asyncServices.checkEmailExists(email);
        return !exists || 'Email already exists';
    },
    companyDomain: async (email) => {
        const valid = await asyncServices.validateCompanyDomain(email);
        return valid || 'Must use company email domain';
    },
    ipNotBlocked: async (ip) => {
        const notBlocked = await asyncServices.checkIPNotBlocked(ip);
        return notBlocked || 'IP address is blocked';
    },
    cardValid: async (card) => {
        const valid = await asyncServices.validateCreditCard(card);
        return valid || 'Invalid credit card number';
    }
};

const superstructAsyncSchemas = {
    userRegistration: object({
        username: size(string(), 3, 20),
        email: pattern(string(), /^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        password: size(string(), 8, 100),
        confirmPassword: string(),
        age: min(max(integer(), 120), 18),
        acceptTerms: boolean(),
        ipAddress: string()
    }),

    payment: object({
        cardNumber: string(),
        expiryMonth: min(max(integer(), 12), 1),
        expiryYear: min(max(integer(), 2030), 2024),
        cvv: size(string(), 3, 3),
        amount: min(max(number(), 10000), 0.01),
        currency: enums(["USD", "EUR", "GBP"]),
        merchantEmail: pattern(string(), /^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        customerIP: string()
    }),

    bulkUsers: array(object({
        id: string(),
        username: size(string(), 3, 20),
        email: pattern(string(), /^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        department: enums(["IT", "HR", "Finance", "Marketing"]),
        role: enums(["admin", "user", "viewer"]),
        active: boolean()
    }))
};

// =============================================================================
// VALIDANT ASYNC SCHEMAS
// =============================================================================

const validantAsyncSchemas = {
    userRegistration: {
        username: [
            required(),
            stringMinLen(3),
            stringMaxLen(20),
            async (username) => {
                const available = await asyncServices.checkUsernameAvailable(username);
                if (!available) {
                    return {
                        ruleName: 'usernameAvailable',
                        attemptedValue: username,
                        errorMessage: 'Username is already taken'
                    };
                }
            }
        ],
        email: [
            required(),
            emailAddress(),
            async (email) => {
                const exists = await asyncServices.checkEmailExists(email);
                if (exists) {
                    return {
                        ruleName: 'emailUnique',
                        attemptedValue: email,
                        errorMessage: 'Email already exists'
                    };
                }
            },
            async (email) => {
                const validDomain = await asyncServices.validateCompanyDomain(email);
                if (!validDomain) {
                    return {
                        ruleName: 'companyDomain',
                        attemptedValue: email,
                        errorMessage: 'Must use company email domain'
                    };
                }
            }
        ],
        password: [required(), stringMinLen(8), stringMaxLen(100)],
        confirmPassword: [
            required(),
            (confirmPassword, data) => {
                if (confirmPassword !== data.password) {
                    return {
                        ruleName: 'passwordMatch',
                        attemptedValue: confirmPassword,
                        errorMessage: 'Passwords don\'t match'
                    };
                }
            }
        ],
        age: [required(), isNumber(), minNumber(18), maxNumber(120)],
        acceptTerms: [
            required(),
            (acceptTerms) => {
                if (acceptTerms !== true) {
                    return {
                        ruleName: 'acceptTerms',
                        attemptedValue: acceptTerms,
                        errorMessage: 'Must accept terms'
                    };
                }
            }
        ],
        ipAddress: [
            required(),
            async (ip) => {
                const notBlocked = await asyncServices.checkIPNotBlocked(ip);
                if (!notBlocked) {
                    return {
                        ruleName: 'ipNotBlocked',
                        attemptedValue: ip,
                        errorMessage: 'IP address is blocked'
                    };
                }
            }
        ]
    },

    payment: {
        cardNumber: [
            required(),
            async (card) => {
                const valid = await asyncServices.validateCreditCard(card);
                if (!valid) {
                    return {
                        ruleName: 'cardValid',
                        attemptedValue: card,
                        errorMessage: 'Invalid credit card number'
                    };
                }
            }
        ],
        expiryMonth: [required(), isNumber(), minNumber(1), maxNumber(12)],
        expiryYear: [required(), isNumber(), minNumber(2024), maxNumber(2030)],
        cvv: [required(), stringMinLen(3), stringMaxLen(3)],
        amount: [required(), isNumber(), minNumber(0.01), maxNumber(10000)],
        currency: [required(), elementOf(["USD", "EUR", "GBP"])],
        merchantEmail: [
            required(),
            emailAddress(),
            async (email) => {
                const validDomain = await asyncServices.validateCompanyDomain(email);
                if (!validDomain) {
                    return {
                        ruleName: 'merchantDomain',
                        attemptedValue: email,
                        errorMessage: 'Invalid merchant domain'
                    };
                }
            }
        ],
        customerIP: [
            required(),
            async (ip) => {
                const notBlocked = await asyncServices.checkIPNotBlocked(ip);
                if (!notBlocked) {
                    return {
                        ruleName: 'customerIP',
                        attemptedValue: ip,
                        errorMessage: 'Customer IP is blocked'
                    };
                }
            }
        ]
    },

    bulkUsers: {
        users: {
            arrayElementRule: {
                id: [required()],
                        username: [
            required(),
            stringMinLen(3),
            stringMaxLen(20),
            async (username) => {
                        const available = await asyncServices.checkUsernameAvailable(username);
                        if (!available) {
                            return {
                                ruleName: 'usernameAvailable',
                                attemptedValue: username,
                                errorMessage: 'Username taken'
                            };
                        }
                    }
                ],
                email: [
                    required(),
                    emailAddress(),
                    async (email) => {
                        const exists = await asyncServices.checkEmailExists(email);
                        if (exists) {
                            return {
                                ruleName: 'emailUnique',
                                attemptedValue: email,
                                errorMessage: 'Email exists'
                            };
                        }
                    }
                ],
                department: [required(), elementOf(["IT", "HR", "Finance", "Marketing"])],
                role: [required(), elementOf(["admin", "user", "viewer"])],
                active: [required()]
            }
        }
    }
};

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

const validationFunctions = {
    // Zod async validation
    zod: {
        userRegistration: async (data) => {
            try {
                await zodAsyncSchemas.userRegistration.parseAsync(data);
                return true;
            } catch (error) {
                return false;
            }
        },
        payment: async (data) => {
            try {
                await zodAsyncSchemas.payment.parseAsync(data);
                return true;
            } catch (error) {
                return false;
            }
        },
        bulkUsers: async (data) => {
            try {
                await zodAsyncSchemas.bulkUsers.parseAsync(data);
                return true;
            } catch (error) {
                return false;
            }
        }
    },

    // Joi async validation
    joi: {
        userRegistration: async (data) => {
            try {
                await joiAsyncSchemas.userRegistration.validateAsync(data);
                return true;
            } catch (error) {
                return false;
            }
        },
        payment: async (data) => {
            try {
                await joiAsyncSchemas.payment.validateAsync(data);
                return true;
            } catch (error) {
                return false;
            }
        },
        bulkUsers: async (data) => {
            try {
                await joiAsyncSchemas.bulkUsers.validateAsync(data);
                return true;
            } catch (error) {
                return false;
            }
        }
    },

    // Yup async validation
    yup: {
        userRegistration: async (data) => {
            try {
                await yupAsyncSchemas.userRegistration.validate(data);
                return true;
            } catch (error) {
                return false;
            }
        },
        payment: async (data) => {
            try {
                await yupAsyncSchemas.payment.validate(data);
                return true;
            } catch (error) {
                return false;
            }
        },
        bulkUsers: async (data) => {
            try {
                await yupAsyncSchemas.bulkUsers.validate(data);
                return true;
            } catch (error) {
                return false;
            }
        }
    },

    // Superstruct async validation (manual async checks)
    superstruct: {
        userRegistration: async (data) => {
            try {
                assert(data, superstructAsyncSchemas.userRegistration);
                
                // Manual async validations
                const usernameCheck = await asyncValidators.usernameAvailable(data.username);
                if (usernameCheck !== true) return false;
                
                const emailCheck = await asyncValidators.emailUnique(data.email);
                if (emailCheck !== true) return false;
                
                const domainCheck = await asyncValidators.companyDomain(data.email);
                if (domainCheck !== true) return false;
                
                const ipCheck = await asyncValidators.ipNotBlocked(data.ipAddress);
                if (ipCheck !== true) return false;
                
                if (data.password !== data.confirmPassword) return false;
                if (data.acceptTerms !== true) return false;
                
                return true;
            } catch (error) {
                return false;
            }
        },
        payment: async (data) => {
            try {
                assert(data, superstructAsyncSchemas.payment);
                
                const cardCheck = await asyncValidators.cardValid(data.cardNumber);
                if (cardCheck !== true) return false;
                
                const domainCheck = await asyncValidators.companyDomain(data.merchantEmail);
                if (domainCheck !== true) return false;
                
                const ipCheck = await asyncValidators.ipNotBlocked(data.customerIP);
                if (ipCheck !== true) return false;
                
                return true;
            } catch (error) {
                return false;
            }
        },
        bulkUsers: async (data) => {
            try {
                assert(data, superstructAsyncSchemas.bulkUsers);
                
                // Check each user's async validations
                for (const user of data) {
                    const usernameCheck = await asyncValidators.usernameAvailable(user.username);
                    if (usernameCheck !== true) return false;
                    
                    const emailCheck = await asyncValidators.emailUnique(user.email);
                    if (emailCheck !== true) return false;
                }
                
                return true;
            } catch (error) {
                return false;
            }
        }
    },

    // Validant async validation
    validant: {
        userRegistration: async (data) => {
            try {
                const validator = new AsyncValidator(validantAsyncSchemas.userRegistration);
                const result = await validator.validateAsync(data);
                return result.isValid;
            } catch (error) {
                return false;
            }
        },
        payment: async (data) => {
            try {
                const validator = new AsyncValidator(validantAsyncSchemas.payment);
                const result = await validator.validateAsync(data);
                return result.isValid;
            } catch (error) {
                return false;
            }
        },
        bulkUsers: async (data) => {
            try {
                const validator = new AsyncValidator(validantAsyncSchemas.bulkUsers);
                // Wrap the array data for validant
                const wrappedData = { users: data };
                const result = await validator.validateAsync(wrappedData);
                return result.isValid;
            } catch (error) {
                return false;
            }
        }
    }
};

// =============================================================================
// BENCHMARK EXECUTION
// =============================================================================

async function runAsyncBenchmarks() {
    console.log('\n🚀 Async Validation Library Benchmark\n');
    console.log('Testing 4 libraries with realistic async validation scenarios:');
    console.log('- zod (with async refinements)');
    console.log('- joi (with external async validation)');
    console.log('- yup (with async test methods)');
    console.log('- superstruct (with manual async checks)');
    console.log('- validant (with AsyncValidator)\n');
    
    console.log('Note: fastest-validator excluded (no native async support)\n');
    console.log('=' .repeat(80));

    const scenarios = [
        {
            name: 'User Registration (Async)',
            description: 'Username availability + Email uniqueness + Domain validation + IP check',
            data: userRegistrationData,
            key: 'userRegistration'
        },
        {
            name: 'Payment Processing (Async)', 
            description: 'Credit card validation + Merchant domain + IP blacklist check',
            data: paymentData,
            key: 'payment'
        },
        {
            name: 'Bulk User Import (Async)',
            description: 'Array of 10 users with username/email uniqueness checks',
            data: bulkUserData,
            key: 'bulkUsers'
        }
    ];

    for (const scenario of scenarios) {
        console.log(`\n📊 ${scenario.name}`);
        console.log(`📝 ${scenario.description}`);
        console.log('-'.repeat(80));

        // Test that all validations work first
        console.log('\n🧪 Testing validation functions...');
        const libraries = ['zod', 'joi', 'yup', 'superstruct', 'validant'];
        
        for (const lib of libraries) {
            try {
                const result = await validationFunctions[lib][scenario.key](scenario.data);
                console.log(`   ✅ ${lib}: ${result ? 'PASS' : 'FAIL (expected for some test data)'}`);
            } catch (error) {
                console.log(`   ❌ ${lib}: ERROR - ${error.message}`);
            }
        }

        console.log('\n⏱️  Running benchmarks...\n');

        // Create benchmark suite
        const suite = new Benchmark.Suite();
        
        // Add async benchmark tests
        for (const lib of libraries) {
            suite.add(lib, {
                defer: true,
                fn: async function(deferred) {
                    try {
                        await validationFunctions[lib][scenario.key](scenario.data);
                        deferred.resolve();
                    } catch (error) {
                        deferred.resolve();
                    }
                }
            });
        }

        // Run the benchmark
        await new Promise((resolve) => {
            suite
                .on('cycle', function(event) {
                    const benchmark = event.target;
                    const opsPerSec = benchmark.hz;
                    const rme = benchmark.stats.rme;
                    const samples = benchmark.stats.sample.length;
                    
                    console.log(`${benchmark.name.padEnd(12)} | ${opsPerSec.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).padStart(8)} ops/sec | ±${rme.toFixed(2)}% | ${samples} samples`);
                })
                .on('complete', function() {
                    const fastest = this.filter('fastest')[0];
                    const slowest = this.filter('slowest')[0];
                    const speedup = (fastest.hz / slowest.hz).toFixed(1);
                    
                    console.log(`\n🏆 Winner: ${fastest.name} (${speedup}x faster than slowest)`);
                    resolve();
                })
                .run({ async: true });
        });
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 Async Validation Benchmark Complete!');
    console.log('\nKey Insights:');
    console.log('• Async validation performance heavily depends on I/O latency simulation');
    console.log('• Libraries with built-in async support generally perform better');
    console.log('• Manual async validation (superstruct) adds overhead');
    console.log('• Real-world performance will vary based on actual API response times');
    console.log('=' .repeat(80));
}

// Run the benchmarks
if (require.main === module) {
    runAsyncBenchmarks().catch(console.error);
}

module.exports = { runAsyncBenchmarks }; 