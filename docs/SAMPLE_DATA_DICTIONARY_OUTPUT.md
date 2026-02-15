# Data Dictionary

**System Name:** Sales Analytics System  
**Document Version:** 1.0  
**Date of Document:** 2025-02-15

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Number of Tables** | 2 |
| **Total Number of Columns** | 6 |

This document provides a business-friendly overview of the data structures used in the system. Each table is described below with its columns, data types, and business descriptions suitable for stakeholders and external clients.

---

## Table: CounterVisit

This table stores data related to **Counter Visit**. It is used by the system to maintain records and support business processes.

| Column Name | Data Type | Length | Required | Description |
|-------------|-----------|--------|----------|-------------|
| Period_ID | Text | 7 | Yes | Unique identifier for the reporting period. |
| BU | Text | 5 | No | Code or short identifier for the bu. |
| Amount | Number | — | No | Stores amount for this record. |

---

## Table: Products

This table stores data related to **Products**. It is used by the system to maintain records and support business processes.

| Column Name | Data Type | Length | Required | Description |
|-------------|-----------|--------|----------|-------------|
| id | Number | — | Yes | Unique identifier for this record. |
| product_name | Text | 200 | Yes | Name or label for the product. |
| created_at | DateTime | — | No | Date and time when this record was created or updated. |

---

*End of Data Dictionary*
