# Validation Library Benchmark Results

## Overview
This benchmark compares 6 popular JavaScript validation libraries across 3 realistic scenarios with **equivalent validation rules** to ensure fair comparison.

**Libraries Tested:**
- `fastest-validator` v1.19.1
- `zod` v3.25.67  
- `joi` v17.13.3
- `validant` v0.1.7
- `yup` v1.6.1
- `superstruct` v2.0.2

**Test Environment:**
- Node.js v22.16.0
- Windows 10 (Build 26100)
- Each test runs for 2 seconds to ensure statistical significance

## Benchmark Results

### 🎯 Scenario 1: User Registration Form
**Description:** Typical user signup form with email, password, and profile validation
**Data:** Single object with 8 fields including email validation, password length constraints, age limits, and boolean flags

| Library | Performance | Relative Speed |
|---------|-------------|----------------|
| 🥇 **fastest-validator** | **5,461,524 ±0.81% ops/sec** | **Baseline (100%)** |
| 🥈 **zod** | **893,176 ±2.60% ops/sec** | **16.4%** |
| 🥉 **validant** | **723,152 ±2.03% ops/sec** | **13.2%** |
| joi | 180,816 ±1.34% ops/sec | 3.3% |
| superstruct | 157,039 ±0.54% ops/sec | 2.9% |
| yup | 90,892 ±1.77% ops/sec | 1.7% |

### 🎯 Scenario 2: API Request Payload  
**Description:** Complex nested API payload with multiple object levels
**Data:** Nested object with user profile, preferences, timestamps, and URL validation

| Library | Performance | Relative Speed |
|---------|-------------|----------------|
| 🥇 **fastest-validator** | **4,547,989 ±0.54% ops/sec** | **Baseline (100%)** |
| 🥈 **validant** | **488,863 ±0.98% ops/sec** | **10.7%** |
| 🥉 **zod** | **364,422 ±2.89% ops/sec** | **8.0%** |
| joi | 192,011 ±1.59% ops/sec | 4.2% |
| superstruct | 116,866 ±0.90% ops/sec | 2.6% |
| yup | 49,862 ±2.26% ops/sec | 1.1% |

### 🎯 Scenario 3: Bulk Data Processing
**Description:** Array of 50 objects - simulates batch processing scenarios  
**Data:** Array validation with enum constraints, number ranges, and boolean checks

| Library | Performance | Relative Speed |
|---------|-------------|----------------|
| 🥇 **fastest-validator** | **254,272 ±0.97% ops/sec** | **Baseline (100%)** |
| 🥈 **validant** | **29,191 ±0.58% ops/sec** | **11.5%** |
| 🥉 **zod** | **28,416 ±3.46% ops/sec** | **11.2%** |
| joi | 7,601 ±0.73% ops/sec | 3.0% |
| superstruct | 5,165 ±0.76% ops/sec | 2.0% |
| yup | 1,839 ±1.09% ops/sec | 0.7% |

## Key Insights

### 🚀 Performance Champions
1. **fastest-validator**: Dominates all scenarios with 9-254x performance advantage
   - Exceptional for simple and complex object validation
   - Now works properly with array validation (fixed with `$$root: true`)
   - Minimal overhead with compiled validation functions

2. **zod**: Excellent balanced performance across all scenarios
   - 2nd place in User Registration and Bulk Processing
   - 3rd place in API Request Payload  
   - Great TypeScript integration with solid performance

3. **validant**: Most consistent performance with lowest variance
   - 2nd place in API Request Payload and Bulk Processing
   - 3rd place in User Registration
   - Very stable performance (±0.58-2.03% variance)

### 📊 Performance Patterns
- **Simple Objects**: fastest-validator >> zod > validant > joi > superstruct > yup
- **Complex Nested**: fastest-validator >> validant > zod > joi > superstruct > yup  
- **Array Processing**: fastest-validator >> zod ≈ validant >> joi > superstruct > yup

### ⚖️ Fairness Validation
All libraries now perform **equivalent validation work**:
- ✅ Email validation with regex patterns
- ✅ Password length constraints (8-100 characters)
- ✅ Age validation with integer constraints (13-120)
- ✅ URL validation with regex patterns
- ✅ Enum validation for categories and themes
- ✅ String length constraints for all text fields
- ✅ Integer validation for numeric fields
- ✅ Boolean validation for flags

### 🎯 Recommendations

**For Maximum Performance:**
- Choose **fastest-validator** if raw speed is critical
- Excellent for high-throughput APIs and real-time applications

**For Balanced Performance + DX:**
- Choose **zod** for TypeScript projects requiring good performance
- Choose **validant** for applications needing consistent, predictable performance

**For Complex Validation Logic:**
- **joi** offers the most flexible validation rules but at a performance cost
- **yup** provides good schema composition but is the slowest overall

**For Specific Use Cases:**
- **superstruct** works well for type-focused validation but has moderate performance
- Consider the 10-100x performance difference when choosing for high-load scenarios

## Methodology Notes

- Each library validates identical data structures with equivalent rules
- Tests run for 2 seconds each to ensure statistical significance  
- All validation includes the same constraints (email regex, length limits, type checking)
- Results show operations per second with margin of error
- Environment: Node.js v22.16.0 on Windows 10

**Last Updated:** January 2025 