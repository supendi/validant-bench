/**
 * Insurance Claim Validation Benchmark
 * 
 * This benchmark tests the performance of various validation libraries when processing
 * complex, real-world insurance claim data. It simulates a comprehensive insurance
 * claim processing system with:
 * 
 * - Complex nested object validation (policy holder, claimant, vehicle, incident, damages)
 * - Async external service validation (SSN, VIN, policy status)
 * - Business rule validation (age limits, policy dates, claim amounts)
 * - Realistic mock data and service delays
 * 
 * Libraries tested: zod, joi, yup, validant
 * 
 * This benchmark demonstrates how validation libraries perform with complex,
 * enterprise-level data structures that include async validation requirements.
 */

const Benchmark = require('benchmark');

// Library imports
const z = require('zod');
const Joi = require('joi');
const yup = require('yup');
const { string, number, integer, array, object, boolean, size, min, max, assert, pattern, enums } = require("superstruct");
const { AsyncValidator, AsyncValidationRule, required, minNumber, maxNumber, emailAddress, isString, isNumber, elementOf, arrayMinLen, arrayMaxLen, stringMinLen, stringMaxLen, regularExpression } = require("validant");

// =============================================================================
// MOCK EXTERNAL SERVICES (Simulating Insurance Industry APIs)
// =============================================================================

const mockInsuranceServices = {
    // Mock SSN database
    validSSNs: new Set(['123-45-6789', '987-65-4321', '456-78-9012', '321-54-9876']),
    
    // Mock VIN database with vehicle info
    validVINs: new Map([
        ['1HGBH41JXMN109186', { make: 'Honda', model: 'Civic', year: 2021 }],
        ['1FTFW1ET5DFC12345', { make: 'Ford', model: 'F-150', year: 2013 }],
        ['WAUV78E25KN123456', { make: 'Audi', model: 'Q7', year: 2019 }],
        ['5NPE34AF2EH123456', { make: 'Hyundai', model: 'Sonata', year: 2014 }]
    ]),
    
    // Mock policy status database
    activePolicies: new Map([
        ['POL-2024-001234', { isActive: true, hasOutstandingPremiums: false }],
        ['POL-2024-005678', { isActive: true, hasOutstandingPremiums: true }],
        ['POL-2023-EXPIRED001', { isActive: false, hasOutstandingPremiums: false }],
        ['POL-2024-OVERDUE999', { isActive: true, hasOutstandingPremiums: true }]
    ])
};

// Mock async services with realistic delays
const externalServices = {
    async validateSSN(ssn) {
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 5));
        return mockInsuranceServices.validSSNs.has(ssn);
    },

    async validateVIN(vin) {
        await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 5));
        const vehicleInfo = mockInsuranceServices.validVINs.get(vin);
        return {
            isValid: !!vehicleInfo,
            vehicleInfo: vehicleInfo
        };
    },

    async validatePolicyStatus(policyNumber) {
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 5));
        const status = mockInsuranceServices.activePolicies.get(policyNumber);
        return status || { isActive: false, hasOutstandingPremiums: false };
    }
};

// =============================================================================
// TEST DATA - Complex Insurance Claim
// =============================================================================

const insuranceClaimData = {
    claimNumber: "INS-2024-000001",
    claimType: "AUTO_ACCIDENT",
    policyHolder: {
        firstName: "John",
        lastName: "Smith",
        dateOfBirth: new Date("1985-06-15"),
        ssn: "123-45-6789",
        policyNumber: "POL-2024-001234",
        policyStartDate: new Date("2024-01-01"),
        policyEndDate: new Date("2024-12-31"),
        email: "john.smith@email.com",
        premiumAmount: 1200,
        coverageType: "COMPREHENSIVE",
        riskScore: 25,
        address: {
            street: "123 Main Street",
            city: "Anytown",
            state: "CA",
            zipCode: "90210",
            country: "USA"
        },
        phone: "555-123-4567"
    },
    claimant: {
        firstName: "John",
        lastName: "Smith",
        dateOfBirth: new Date("1985-06-15"),
        ssn: "123-45-6789",
        email: "john.smith@email.com",
        phone: "555-123-4567",
        address: {
            street: "123 Main Street",
            city: "Anytown",
            state: "CA",
            zipCode: "90210-1234",
            country: "USA"
        }
    },
    vehicle: {
        vin: "1HGBH41JXMN109186",
        make: "Honda",
        model: "Civic",
        year: 2021,
        mileage: 25000,
        value: 22000,
        primaryUse: "PERSONAL",
        safetyRating: 5,
        antiTheftDevices: ["Alarm System", "GPS Tracker"]
    },
    incident: {
        incidentDate: new Date("2024-03-15"),
        incidentTime: "14:30",
        description: "Vehicle was rear-ended while stopped at a red light. The impact caused significant damage to the rear bumper and trunk area. No injuries were reported at the scene, but the driver experienced minor neck pain later that evening.",
        policeReportNumber: "PR-2024-789456",
        weatherConditions: "CLEAR",
        roadConditions: "DRY",
        atFaultParties: ["Other Driver"],
        witnessCount: 2,
        location: {
            street: "456 Oak Avenue",
            city: "Anytown",
            state: "CA",
            zipCode: "90210",
            country: "USA"
        }
    },
    damages: [
        {
            component: "Rear Bumper",
            severity: "MODERATE",
            estimatedCost: 1500,
            repairShop: "Quality Auto Body",
            partsRequired: ["Rear Bumper Cover", "Bumper Reinforcement"],
            laborHours: 8,
            isPreExistingDamage: false
        },
        {
            component: "Trunk",
            severity: "MINOR",
            estimatedCost: 800,
            repairShop: "Quality Auto Body",
            partsRequired: ["Trunk Lid"],
            laborHours: 4,
            isPreExistingDamage: false
        }
    ],
    medicalClaims: [],
    claimAmount: 2300,
    supportingDocuments: ["police-report-789456.pdf", "photos-damage-001.jpg", "estimate-quality-auto.pdf"],
    attorneyInvolved: false,
    priorClaims: 1,
    submissionDate: new Date("2024-03-16")
};

// =============================================================================
// ZOD ASYNC SCHEMA
// =============================================================================

const zodAsyncSchema = z.object({
    claimNumber: z.string()
        .regex(/^INS-\d{4}-\d{6}$/, "Claim number must follow format: INS-YEAR-XXXXXX"),
    claimType: z.enum(["AUTO_ACCIDENT", "THEFT", "VANDALISM", "NATURAL_DISASTER", "COMPREHENSIVE"]),
    
    policyHolder: z.object({
        firstName: z.string().min(1).max(50),
        lastName: z.string().min(1).max(50),
        dateOfBirth: z.date()
            .refine(date => {
                const age = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365));
                return age >= 16 && age <= 100;
            }, "Age must be between 16 and 100"),
        ssn: z.string()
            .refine(async (ssn) => await externalServices.validateSSN(ssn), {
                message: "Invalid Social Security Number"
            }),
        policyNumber: z.string()
            .refine(async (policyNumber) => {
                const status = await externalServices.validatePolicyStatus(policyNumber);
                return status.isActive && !status.hasOutstandingPremiums;
            }, {
                message: "Policy is not active or has outstanding premiums"
            }),
        policyStartDate: z.date(),
        policyEndDate: z.date(),
        email: z.string().email(),
        phone: z.string().optional(),
        premiumAmount: z.number().min(100).max(50000),
        coverageType: z.enum(["BASIC", "PREMIUM", "COMPREHENSIVE"]),
        riskScore: z.number().min(1).max(100),
        address: z.object({
            street: z.string().min(1),
            city: z.string().min(1),
            state: z.string().min(1),
            zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
            country: z.string().min(1)
        })
    }),
    
    claimant: z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        dateOfBirth: z.date().optional(),
        email: z.string().email(),
        phone: z.string().optional(),
        ssn: z.string()
            .refine(async (ssn) => await externalServices.validateSSN(ssn), {
                message: "Invalid Social Security Number"
            }),
        address: z.object({
            street: z.string().min(1),
            city: z.string().min(1),
            state: z.string().min(1),
            zipCode: z.string().min(1),
            country: z.string().min(1)
        })
    }),
    
    vehicle: z.object({
        vin: z.string()
            .refine(async (vin) => {
                const result = await externalServices.validateVIN(vin);
                return result.isValid;
            }, {
                message: "Invalid Vehicle Identification Number"
            }),
        make: z.string().min(1),
        model: z.string().min(1),
        year: z.number().min(1990).max(new Date().getFullYear() + 1),
        mileage: z.number().min(0),
        value: z.number().min(1000),
        primaryUse: z.enum(["PERSONAL", "COMMERCIAL", "BUSINESS"]),
        safetyRating: z.number().min(1).max(5),
        antiTheftDevices: z.array(z.string()).optional()
    }),
    
    incident: z.object({
        incidentDate: z.date(),
        incidentTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        description: z.string().min(50),
        weatherConditions: z.enum(["CLEAR", "RAIN", "SNOW", "FOG", "ICE", "SEVERE"]),
        roadConditions: z.enum(["DRY", "WET", "ICY", "CONSTRUCTION", "POOR_VISIBILITY"]),
        witnessCount: z.number().min(0).max(20),
        location: z.object({
            street: z.string().min(1),
            city: z.string().min(1),
            state: z.string().min(1),
            zipCode: z.string().min(1),
            country: z.string().min(1)
        })
    }),
    
    damages: z.array(z.object({
        component: z.string().min(1),
        severity: z.enum(["MINOR", "MODERATE", "SEVERE", "TOTAL_LOSS"]),
        estimatedCost: z.number().min(1).max(200000),
        repairShop: z.string().optional(),
        partsRequired: z.array(z.string()).optional(),
        laborHours: z.number().min(0).max(500),
        isPreExistingDamage: z.boolean().optional()
    })).min(1),
    
    medicalClaims: z.array(z.any()).optional(),
    claimAmount: z.number().min(1),
    supportingDocuments: z.array(z.string()).min(1),
    attorneyInvolved: z.boolean(),
    attorneyDetails: z.object({
        name: z.string(),
        barNumber: z.string(),
        firm: z.string(),
        phone: z.string()
    }).optional(),
    priorClaims: z.number().min(0),
    submissionDate: z.date()
        .refine(date => date <= new Date(), "Submission date cannot be in the future")
});

// =============================================================================
// JOI ASYNC SCHEMA
// =============================================================================

const joiAsyncSchema = Joi.object({
    claimNumber: Joi.string().pattern(/^INS-\d{4}-\d{6}$/).required(),
    claimType: Joi.string().valid("AUTO_ACCIDENT", "THEFT", "VANDALISM", "NATURAL_DISASTER", "COMPREHENSIVE").required(),
    
    policyHolder: Joi.object({
        firstName: Joi.string().min(1).max(50).required(),
        lastName: Joi.string().min(1).max(50).required(),
        dateOfBirth: Joi.date().required(),
        ssn: Joi.string().required()
            .external(async (ssn) => {
                const isValid = await externalServices.validateSSN(ssn);
                if (!isValid) throw new Error("Invalid Social Security Number");
                return ssn;
            }),
        policyNumber: Joi.string().required()
            .external(async (policyNumber) => {
                const status = await externalServices.validatePolicyStatus(policyNumber);
                if (!status.isActive || status.hasOutstandingPremiums) {
                    throw new Error("Policy is not active or has outstanding premiums");
                }
                return policyNumber;
            }),
        policyStartDate: Joi.date().required(),
        policyEndDate: Joi.date().required(),
        email: Joi.string().email().required(),
        phone: Joi.string().allow('').optional(),
        premiumAmount: Joi.number().min(100).max(50000).required(),
        coverageType: Joi.string().valid("BASIC", "PREMIUM", "COMPREHENSIVE").required(),
        riskScore: Joi.number().min(1).max(100).required(),
        address: Joi.object({
            street: Joi.string().required(),
            city: Joi.string().required(),
            state: Joi.string().required(),
            zipCode: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required(),
            country: Joi.string().required()
        }).required()
    }).required(),
    
    claimant: Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        dateOfBirth: Joi.date().optional(),
        ssn: Joi.string().optional(),
        email: Joi.string().email().required(),
        phone: Joi.string().allow('').optional(),
        address: Joi.object({
            street: Joi.string().required(),
            city: Joi.string().required(),
            state: Joi.string().required(),
            zipCode: Joi.string().required(),
            country: Joi.string().required()
        }).required()
    }).required(),
    
    vehicle: Joi.object({
        vin: Joi.string().required()
            .external(async (vin) => {
                const result = await externalServices.validateVIN(vin);
                if (!result.isValid) throw new Error("Invalid VIN");
                return vin;
            }),
        make: Joi.string().required(),
        model: Joi.string().required(),
        year: Joi.number().min(1990).max(new Date().getFullYear() + 1).required(),
        mileage: Joi.number().min(0).required(),
        value: Joi.number().min(1000).required(),
        primaryUse: Joi.string().valid("PERSONAL", "COMMERCIAL", "BUSINESS").required(),
        safetyRating: Joi.number().min(1).max(5).required(),
        antiTheftDevices: Joi.array().items(Joi.string()).optional()
    }).required(),
    
    incident: Joi.object({
        incidentDate: Joi.date().required(),
        incidentTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        description: Joi.string().min(50).required(),
        policeReportNumber: Joi.string().allow('').optional(),
        weatherConditions: Joi.string().valid("CLEAR", "RAIN", "SNOW", "FOG", "ICE", "SEVERE").required(),
        roadConditions: Joi.string().valid("DRY", "WET", "ICY", "CONSTRUCTION", "POOR_VISIBILITY").required(),
        atFaultParties: Joi.array().items(Joi.string()).optional(),
        witnessCount: Joi.number().min(0).max(20).required(),
        location: Joi.object({
            street: Joi.string().required(),
            city: Joi.string().required(),
            state: Joi.string().required(),
            zipCode: Joi.string().required(),
            country: Joi.string().required()
        }).required()
    }).required(),
    
    damages: Joi.array().items(Joi.object({
        component: Joi.string().required(),
        severity: Joi.string().valid("MINOR", "MODERATE", "SEVERE", "TOTAL_LOSS").required(),
        estimatedCost: Joi.number().min(1).max(200000).required(),
        repairShop: Joi.string().allow('').optional(),
        partsRequired: Joi.array().items(Joi.string()).optional(),
        laborHours: Joi.number().min(0).max(500).required(),
        isPreExistingDamage: Joi.boolean().optional()
    })).min(1).required(),
    
    medicalClaims: Joi.array().items(Joi.any()).optional(),
    claimAmount: Joi.number().min(1).required(),
    supportingDocuments: Joi.array().items(Joi.string()).min(1).required(),
    attorneyInvolved: Joi.boolean().required(),
    attorneyDetails: Joi.object().optional(),
    priorClaims: Joi.number().min(0).required(),
    submissionDate: Joi.date().max('now').required()
});

// =============================================================================
// YUP ASYNC SCHEMA
// =============================================================================

const yupAsyncSchema = yup.object({
    claimNumber: yup.string()
        .matches(/^INS-\d{4}-\d{6}$/, "Invalid claim number format")
        .required(),
    claimType: yup.string().oneOf(["AUTO_ACCIDENT", "THEFT", "VANDALISM", "NATURAL_DISASTER", "COMPREHENSIVE"]).required(),
    
    policyHolder: yup.object({
        firstName: yup.string().min(1).max(50).required(),
        lastName: yup.string().min(1).max(50).required(),
        dateOfBirth: yup.date().required(),
        ssn: yup.string().required()
            .test('ssn-valid', 'Invalid SSN', async (ssn) => {
                return await externalServices.validateSSN(ssn);
            }),
        policyNumber: yup.string().required()
            .test('policy-active', 'Policy not active', async (policyNumber) => {
                const status = await externalServices.validatePolicyStatus(policyNumber);
                return status.isActive && !status.hasOutstandingPremiums;
            }),
        policyStartDate: yup.date().required(),
        policyEndDate: yup.date().required(),
        email: yup.string().email().required(),
        phone: yup.string(),
        premiumAmount: yup.number().min(100).max(50000).required(),
        coverageType: yup.string().oneOf(["BASIC", "PREMIUM", "COMPREHENSIVE"]).required(),
        riskScore: yup.number().min(1).max(100).required(),
        address: yup.object({
            street: yup.string().required(),
            city: yup.string().required(),
            state: yup.string().required(),
            zipCode: yup.string().matches(/^\d{5}(-\d{4})?$/).required(),
            country: yup.string().required()
        }).required()
    }).required(),
    
    claimant: yup.object({
        firstName: yup.string().required(),
        lastName: yup.string().required(),
        dateOfBirth: yup.date(),
        email: yup.string().email().required(),
        phone: yup.string(),
        ssn: yup.string(),
        address: yup.object({
            street: yup.string().required(),
            city: yup.string().required(),
            state: yup.string().required(),
            zipCode: yup.string().required(),
            country: yup.string().required()
        }).required()
    }).required(),
    
    vehicle: yup.object({
        vin: yup.string().required()
            .test('vin-valid', 'Invalid VIN', async (vin) => {
                const result = await externalServices.validateVIN(vin);
                return result.isValid;
            }),
        make: yup.string().required(),
        model: yup.string().required(),
        year: yup.number().min(1990).max(new Date().getFullYear() + 1).required(),
        mileage: yup.number().min(0).required(),
        value: yup.number().min(1000).required(),
        primaryUse: yup.string().oneOf(["PERSONAL", "COMMERCIAL", "BUSINESS"]).required(),
        safetyRating: yup.number().min(1).max(5).required(),
        antiTheftDevices: yup.array().of(yup.string())
    }).required(),
    
    incident: yup.object({
        incidentDate: yup.date().required(),
        incidentTime: yup.string().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        description: yup.string().min(50).required(),
        policeReportNumber: yup.string(),
        weatherConditions: yup.string().oneOf(["CLEAR", "RAIN", "SNOW", "FOG", "ICE", "SEVERE"]).required(),
        roadConditions: yup.string().oneOf(["DRY", "WET", "ICY", "CONSTRUCTION", "POOR_VISIBILITY"]).required(),
        atFaultParties: yup.array().of(yup.string()),
        witnessCount: yup.number().min(0).max(20).required(),
        location: yup.object({
            street: yup.string().required(),
            city: yup.string().required(),
            state: yup.string().required(),
            zipCode: yup.string().required(),
            country: yup.string().required()
        }).required()
    }).required(),
    
    damages: yup.array().of(yup.object({
        component: yup.string().required(),
        severity: yup.string().oneOf(["MINOR", "MODERATE", "SEVERE", "TOTAL_LOSS"]).required(),
        estimatedCost: yup.number().min(1).max(200000).required(),
        repairShop: yup.string(),
        partsRequired: yup.array().of(yup.string()),
        laborHours: yup.number().min(0).max(500).required(),
        isPreExistingDamage: yup.boolean()
    })).min(1).required(),
    
    medicalClaims: yup.array(),
    claimAmount: yup.number().min(1).required(),
    supportingDocuments: yup.array().of(yup.string()).min(1).required(),
    attorneyInvolved: yup.boolean().required(),
    attorneyDetails: yup.object({
        name: yup.string(),
        barNumber: yup.string(),
        firm: yup.string(),
        phone: yup.string()
    }),
    priorClaims: yup.number().min(0).required(),
    submissionDate: yup.date().max(new Date()).required()
});

// =============================================================================
// VALIDANT ASYNC SCHEMA
// =============================================================================

function validateSSNFormat() {
    return async function (ssn) {
        if (!ssn) return undefined;
        const isValidFormat = await externalServices.validateSSN(ssn);
        if (!isValidFormat) {
            return {
                ruleName: 'validateSSNFormat',
                attemptedValue: ssn,
                errorMessage: 'Invalid Social Security Number format or number does not exist.'
            };
        }
    };
}

function validateVINNumber() {
    return async function (vin) {
        if (!vin) return undefined;
        const result = await externalServices.validateVIN(vin);
        if (!result.isValid) {
            return {
                ruleName: 'validateVINNumber',
                attemptedValue: vin,
                errorMessage: 'Invalid Vehicle Identification Number.'
            };
        }
    };
}

function validatePolicyActive() {
    return async function (policyNumber) {
        if (!policyNumber) return undefined;
        const status = await externalServices.validatePolicyStatus(policyNumber);
        
        if (!status.isActive) {
            return {
                ruleName: 'validatePolicyActive',
                attemptedValue: policyNumber,
                errorMessage: 'Policy is not active.'
            };
        }
        
        if (status.hasOutstandingPremiums) {
            return {
                ruleName: 'validatePolicyActive',
                attemptedValue: policyNumber,
                errorMessage: 'Policy has outstanding premiums.'
            };
        }
    };
}

const validantAsyncSchema = {
    claimNumber: [
        required('Claim number is required.'),
        isString('Claim number must be a string.'),
        function (claimNumber) {
            if (!/^INS-\d{4}-\d{6}$/.test(claimNumber)) {
                return {
                    ruleName: 'claimNumberFormat',
                    attemptedValue: claimNumber,
                    errorMessage: 'Claim number must follow format: INS-YEAR-XXXXXX'
                };
            }
        }
    ],
    
    claimType: [
        required('Claim type is required.'),
        elementOf(['AUTO_ACCIDENT', 'THEFT', 'VANDALISM', 'NATURAL_DISASTER', 'COMPREHENSIVE'], 'Invalid claim type.')
    ],
    
    policyHolder: {
        firstName: [required(), isString(), stringMinLen(1), stringMaxLen(50)],
        lastName: [required(), isString(), stringMinLen(1), stringMaxLen(50)],
        dateOfBirth: [required()],
        ssn: [required(), validateSSNFormat()],
        policyNumber: [required(), validatePolicyActive()],
        policyStartDate: [required()],
        policyEndDate: [required()],
        email: [required(), emailAddress()],
        phone: [],
        premiumAmount: [required(), minNumber(100), maxNumber(50000)],
        coverageType: [required(), elementOf(['BASIC', 'PREMIUM', 'COMPREHENSIVE'])],
        riskScore: [required(), minNumber(1), maxNumber(100)],
        address: {
            street: [required()],
            city: [required()],
            state: [required()],
            zipCode: [
                required(),
                function (zipCode) {
                    if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
                        return {
                            ruleName: 'zipCodeFormat',
                            attemptedValue: zipCode,
                            errorMessage: 'ZIP code must be in format: 12345 or 12345-6789'
                        };
                    }
                }
            ],
            country: [required()]
        }
    },
    
    claimant: {
        firstName: [required()],
        lastName: [required()],
        dateOfBirth: [],
        email: [required(), emailAddress()],
        phone: [],
        ssn: [validateSSNFormat()],
        address: {
            street: [required()],
            city: [required()],
            state: [required()],
            zipCode: [required()],
            country: [required()]
        }
    },
    
    vehicle: {
        vin: [required(), validateVINNumber()],
        make: [required()],
        model: [required()],
        year: [required(), minNumber(1990), maxNumber(new Date().getFullYear() + 1)],
        mileage: [required(), minNumber(0)],
        value: [required(), minNumber(1000)],
        primaryUse: [required(), elementOf(['PERSONAL', 'COMMERCIAL', 'BUSINESS'])],
        safetyRating: [required(), minNumber(1), maxNumber(5)],
        antiTheftDevices: {
            arrayRules: [],
            arrayElementRule: []
        }
    },
    
    incident: {
        incidentDate: [required()],
        incidentTime: [
            required(),
            function (time) {
                if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
                    return {
                        ruleName: 'timeFormat',
                        attemptedValue: time,
                        errorMessage: 'Time must be in HH:MM format (24-hour).'
                    };
                }
            }
        ],
        description: [
            required(),
            function (description) {
                if (description.length < 50) {
                    return {
                        ruleName: 'descriptionLength',
                        attemptedValue: description,
                        errorMessage: 'Incident description must be at least 50 characters long.'
                    };
                }
            }
        ],
        policeReportNumber: [],
        weatherConditions: [required(), elementOf(['CLEAR', 'RAIN', 'SNOW', 'FOG', 'ICE', 'SEVERE'])],
        roadConditions: [required(), elementOf(['DRY', 'WET', 'ICY', 'CONSTRUCTION', 'POOR_VISIBILITY'])],
        atFaultParties: {
            arrayRules: [],
            arrayElementRule: []
        },
        witnessCount: [required(), minNumber(0), maxNumber(20)],
        location: {
            street: [required()],
            city: [required()],
            state: [required()],
            zipCode: [required()],
            country: [required()]
        }
    },
    
    damages: {
        arrayRules: [arrayMinLen(1, 'At least one damage entry is required.')],
        arrayElementRule: {
            component: [required()],
            severity: [required(), elementOf(['MINOR', 'MODERATE', 'SEVERE', 'TOTAL_LOSS'])],
            estimatedCost: [required(), minNumber(1), maxNumber(200000)],
            repairShop: [],
            partsRequired: {
                arrayRules: [],
                arrayElementRule: []
            },
            laborHours: [required(), minNumber(0), maxNumber(500)],
            isPreExistingDamage: []
        }
    },
    
    medicalClaims: {
        arrayRules: [],
        arrayElementRule: {}
    },
    claimAmount: [required(), minNumber(1)],
    supportingDocuments: {
        arrayRules: [arrayMinLen(1, 'At least one supporting document is required.')]
    },
    attorneyInvolved: [required()],
    attorneyDetails: {
        name: [],
        barNumber: [],
        firm: [],
        phone: []
    },
    priorClaims: [required(), minNumber(0)],
    submissionDate: [
        required(),
        function (submissionDate) {
            if (submissionDate > new Date()) {
                return {
                    ruleName: 'submissionDateFuture',
                    attemptedValue: submissionDate,
                    errorMessage: 'Submission date cannot be in the future.'
                };
            }
        }
    ]
};

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

const validationFunctions = {
    zod: async (data) => {
        try {
            await zodAsyncSchema.parseAsync(data);
            return true;
        } catch (error) {
            return false;
        }
    },
    
    joi: async (data) => {
        try {
            await joiAsyncSchema.validateAsync(data, { allowUnknown: true });
            return true;
        } catch (error) {
            return false;
        }
    },
    
    yup: async (data) => {
        try {
            await yupAsyncSchema.validate(data);
            return true;
        } catch (error) {
            return false;
        }
    },
    
    validant: async (data) => {
        try {
            const validator = new AsyncValidator(validantAsyncSchema);
            const result = await validator.validateAsync(data);
            return result.isValid;
        } catch (error) {
            return false;
        }
    }
};

// =============================================================================
// BENCHMARK EXECUTION
// =============================================================================

async function runInsuranceClaimBenchmark() {
    console.log('\n🏥 Insurance Claim Validation Benchmark\n');
    console.log('Testing complex insurance claim validation with async services:');
    console.log('- SSN validation (external service simulation)');
    console.log('- VIN validation (vehicle database lookup)');
    console.log('- Policy status validation (policy service check)');
    console.log('- Complex nested object validation');
    console.log('- Business rule validation\n');

    console.log('Libraries tested: zod, joi, yup, validant\n');
    console.log('='.repeat(80));

    const scenario = {
        name: 'Insurance Claim Processing',
        description: 'Complex insurance claim with policy holder, vehicle, incident, and damage details',
        data: insuranceClaimData
    };

    console.log(`\n📊 ${scenario.name}`);
    console.log(`📝 ${scenario.description}`);
    console.log('-'.repeat(80));

    // Test that all validations work first
    console.log('\n🧪 Testing validation functions...');
    const libraries = ['zod', 'joi', 'yup', 'validant'];

    for (const lib of libraries) {
        try {
            const result = await validationFunctions[lib](scenario.data);
            console.log(`   ✅ ${lib}: ${result ? 'PASS' : 'FAIL'}`);
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
            fn: async function (deferred) {
                try {
                    await validationFunctions[lib](scenario.data);
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
            .on('cycle', function (event) {
                const benchmark = event.target;
                const opsPerSec = benchmark.hz;
                const rme = benchmark.stats.rme;
                const samples = benchmark.stats.sample.length;

                console.log(`${benchmark.name.padEnd(12)} | ${opsPerSec.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).padStart(8)} ops/sec | ±${rme.toFixed(2)}% | ${samples} samples`);
            })
            .on('complete', function () {
                const fastest = this.filter('fastest')[0];
                const slowest = this.filter('slowest')[0];
                const speedup = (fastest.hz / slowest.hz).toFixed(1);

                console.log(`\n🏆 Winner: ${fastest.name} (${speedup}x faster than slowest)`);
                resolve();
            })
            .run({ async: true });
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎯 Insurance Claim Validation Benchmark Complete!');
    console.log('\nKey Insights:');
    console.log('• Complex nested validation with async services tests real-world scenarios');
    console.log('• Performance heavily depends on external service response times');
    console.log('• Business rule validation adds significant complexity');
    console.log('• Libraries handle deep object validation differently');
    console.log('='.repeat(80));
}

// Run the benchmark
if (require.main === module) {
    runInsuranceClaimBenchmark().catch(console.error);
}

module.exports = { runInsuranceClaimBenchmark }; 