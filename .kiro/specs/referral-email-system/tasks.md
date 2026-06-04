# Implementation Plan: Referral Email System

## Overview

This plan extends the existing HR Contact Finder and Email Generator to support dual-outreach (HR application + referral request). Implementation proceeds in layers: data model → service logic → API routes → UI components → wiring. All changes build on existing files — no new feature directories are created.

## Tasks

- [x] 1. Extend data model and types
  - [x] 1.1 Add contactType and department fields to Prisma schema
    - Add `contactType String @default("hr")` and `department String @default("hr")` to the `CompanyContact` model in `prisma/schema.prisma`
    - Add composite index `@@index([companyId, contactType])` for filtered queries
    - Run `npx prisma migrate dev --name add-contact-type-fields` to generate and apply migration
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 1.2 Extend TypeScript types in `src/features/hr-contact-finder/types.ts`
    - Add `contactType: 'hr' | 'tech'` and `department?: string` to the `Contact` interface
    - Add `mappedDepartment?: string` to `FindContactsResult`
    - Add `SmartBulkSendParams`, `SmartBulkSendProgress`, and `SmartBulkSendResult` interfaces
    - Add `ReferralEmailParams` and `GeneratedReferralEmail` interfaces to `src/features/email/types.ts`
    - _Requirements: 2.1, 2.2, 6.1, 6.2, 3.1_

- [x] 2. Implement Department Mapper
  - [x] 2.1 Create `mapDepartment` function in `src/features/hr-contact-finder/services/department-mapper.service.ts`
    - Implement keyword-to-department lookup table matching design's keyword table
    - Implement AI fallback using existing `generateCompletion` from ai.service when keywords are inconclusive
    - Default to "it" when mapping fails or returns invalid value
    - Validate return value is one of the 14 valid Hunter.io departments
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 1.2, 1.3_

  - [ ]* 2.2 Write property test for department mapping validity
    - **Property 1: Department mapping always returns a valid Hunter.io department**
    - **Validates: Requirements 1.2, 1.3, 7.6**

  - [ ]* 2.3 Write unit tests for department mapper
    - Test keyword matching for each category (it, design, sales, marketing, finance, etc.)
    - Test AI fallback when no keywords match
    - Test default "it" when AI returns invalid value
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 3. Checkpoint - Ensure data model and department mapper work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Extend Hunter Client for department-parameterized search
  - [x] 4.1 Extend `searchPeople` in `src/features/hr-contact-finder/services/hunter-client.service.ts`
    - Add optional `department` parameter to `ApolloSearchParams` interface
    - Modify `searchPeople` to use the provided department value instead of hardcoded "hr"
    - Enforce `limit` of 5 per department call (down from MAX_RESULTS=10)
    - Assign `contactType` based on department parameter: "hr" → "hr", anything else → "tech"
    - _Requirements: 1.4, 1.5, 1.6, 1.7_

  - [ ]* 4.2 Write property test for contact type assignment
    - **Property 3: Contact type assignment matches discovery department**
    - **Validates: Requirements 1.6, 1.7**

- [x] 5. Extend Contact Finder for dual-search orchestration
  - [x] 5.1 Extend `findContacts` in `src/features/hr-contact-finder/services/contact-finder.service.ts`
    - Call `mapDepartment(jobDescription)` to get the tech department filter
    - Check cache for both contact types separately using `contactType` field
    - Make two Hunter.io API calls when cache misses (one for HR, one for tech department)
    - Make only the missing call when one type is cached (API credit optimization)
    - Assign `contactType` and `department` to each contact before caching
    - Do NOT use pattern fallback for tech contacts (only for HR)
    - Return combined contacts with `mappedDepartment` in result
    - _Requirements: 1.1, 1.4, 1.8, 8.1, 8.2, 8.3, 8.5, 8.6_

  - [x] 5.2 Extend `refreshContacts` to clear and re-fetch both types
    - Delete all contacts (both HR and tech) for the company on refresh
    - Make two fresh API calls on refresh
    - _Requirements: 8.5_

  - [x] 5.3 Extend `getCachedContacts` and `cacheContacts` to handle contactType and department fields
    - Read `contactType` and `department` from database records
    - Write `contactType` and `department` when caching new contacts
    - Support partial cache checks (cache may have HR only, tech only, or both)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 5.4 Write property test for dual API call orchestration
    - **Property 2: Dual API call orchestration with correct department filters**
    - **Validates: Requirements 1.1, 1.4, 1.5**

  - [ ]* 5.5 Write property test for cache-aware API optimization
    - **Property 12: Cache-aware API optimization**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.5**

  - [ ]* 5.6 Write property test for contact data round-trip persistence
    - **Property 4: Contact data round-trip persistence**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 5.7 Write property test for cache filtering by contactType
    - **Property 5: Cache filtering by contactType**
    - **Validates: Requirements 2.4**

- [x] 6. Checkpoint - Ensure contact discovery with dual search works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Referral Email Generator
  - [x] 7.1 Create `generateReferralEmail` function in `src/features/email/services/referral-generator.service.ts`
    - Build a referral-specific AI prompt requesting casual tone, 150-word limit, shared tech background mention, and clear referral ask
    - Include in prompt: specific role, 3-5 matching skills, experience level, informal subject line
    - Call existing `generateCompletion` from AI service
    - Parse response into `GeneratedReferralEmail` structure (subject, greeting, body, closing, fullContent)
    - Enforce 150-word body limit post-generation (truncate at last complete sentence if exceeded)
    - Throw AppError on AI failure with code 'AI_SERVICE_ERROR'
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 7.2 Write property test for referral email word count constraint
    - **Property 7: Referral email body word count constraint**
    - **Validates: Requirements 3.5**

  - [ ]* 7.3 Write property test for referral email distinctness
    - **Property 6: Referral email is distinct from HR email**
    - **Validates: Requirements 3.1**

  - [ ]* 7.4 Write unit tests for referral email generator
    - Test prompt construction includes role, skills, experience
    - Test response parsing into structured sections
    - Test 150-word truncation logic
    - Test error handling on AI failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 8. Implement Smart Bulk Sender
  - [x] 8.1 Create `sendToMultipleSmart` function in `src/features/hr-contact-finder/services/bulk-sender.service.ts`
    - Accept `SmartBulkSendParams` with recipients (email + contactType) and both email templates
    - Route HR email to contactType="hr" recipients and referral email to contactType="tech" recipients
    - Send sequentially, yielding `SmartBulkSendProgress` events with contactType per recipient
    - Continue on individual failures
    - Return `SmartBulkSendResult` with `totalHrSent`, `totalReferralSent`, `totalFailed` breakdown
    - Reuse existing `sendEmail` from email-sender.service
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_

  - [ ]* 8.2 Write property test for smart routing correctness
    - **Property 8: Smart routing correctness**
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 8.3 Write property test for send summary accuracy
    - **Property 9: Send summary accuracy with type breakdown**
    - **Validates: Requirements 6.4, 6.5**

  - [ ]* 8.4 Write property test for progress indicator accuracy
    - **Property 10: Progress indicator accuracy with contact type**
    - **Validates: Requirements 6.6**

- [x] 9. Checkpoint - Ensure all backend services work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Extend API routes
  - [x] 10.1 Extend `/api/email/generate` route to support dual generation
    - Accept optional `generateReferral` flag in request body (defaults to true)
    - When `generateReferral=true`, call both `generateEmail` and `generateReferralEmail` in parallel
    - Return response with `hrEmail` and `referralEmail` fields
    - Handle referral generation failure independently (still return HR email on referral failure)
    - _Requirements: 4.5, 3.7_

  - [x] 10.2 Extend `/api/email/send-bulk` route for smart routing
    - Accept extended request body with `recipients` as array of `{ email, contactType }` objects
    - Accept `hrEmail` and `referralEmail` objects (each with subject + body)
    - Call `sendToMultipleSmart` instead of `sendToMultiple`
    - Stream `SmartBulkSendProgress` events with `contactType` field
    - Return extended summary with type breakdown
    - Maintain backward compatibility: if old format is sent (plain recipients array + single subject/body), fall back to existing behavior
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 10.3 Extend `/api/contacts/search` route to return contactType and department
    - Ensure the response includes `contactType` and `department` on each contact
    - No changes to request format needed (jobDescription is already accepted)
    - _Requirements: 2.3_

- [x] 11. Extend UI - Email Preview with Tabs
  - [x] 11.1 Create tabbed email preview component
    - Create `src/features/email/components/DualEmailPreview.tsx`
    - Implement two tabs: "HR Application Email" and "Referral Request Email" with clear labels
    - Show independent loading spinners per tab
    - Allow editing both email templates (preserve edits until new generation or page refresh)
    - Reuse existing `EmailPreview` component for each tab's content
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

  - [x] 11.2 Extend `useEmailGenerator` hook for dual email generation
    - Add `referralEmail` state and `isGeneratingReferral` loading state
    - Extend `generate` function to call the updated `/api/email/generate` endpoint with `generateReferral: true`
    - Add `updateReferralField` function for editing referral email
    - Store both emails and expose them to the page component
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

- [x] 12. Extend UI - Grouped Contact List
  - [x] 12.1 Extend `ContactList` component for grouped display
    - Modify `src/features/hr-contact-finder/components/ContactList.tsx`
    - Split contacts into two visual groups: "HR Contacts" and "Tech Contacts"
    - Show per-group "Select All" checkbox
    - Display routing label under each group header (e.g., "Will receive: HR Application Email")
    - Add contactType badge on each row with distinct colors (blue for HR, green for Tech)
    - Show total selected count across both groups on "Send to Selected" button
    - Hide empty Tech Contacts group when no tech contacts found
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 12.2 Extend `useContactFinder` hook for grouped selection
    - Support per-group toggleAll (HR group and Tech group independently)
    - Track selection state per group
    - Expose group-level selection counts
    - _Requirements: 5.4, 5.5, 5.6_

  - [ ]* 12.3 Write property test for per-group selection state consistency
    - **Property 11: Per-group selection state consistency**
    - **Validates: Requirements 5.5, 5.6**

- [x] 13. Extend UI - Bulk Send Progress with Contact Type
  - [x] 13.1 Extend `BulkSendProgress` component
    - Modify `src/features/hr-contact-finder/components/BulkSendProgress.tsx`
    - Show contactType in progress message (e.g., "Sending 2 of 7 — Tech contact")
    - Display extended summary with HR sent / Referral sent / Failed breakdown
    - _Requirements: 6.4, 6.6_

- [x] 14. Wire everything together on Email Generator page
  - [x] 14.1 Update `src/app/(dashboard)/email-generator/page.tsx`
    - Replace `EmailPreview` with new `DualEmailPreview` component
    - Pass both `hrEmail` and `referralEmail` to preview
    - Update `handleSendToSelected` to pass both email templates and contactType per recipient to the bulk send API
    - Update `handleGenerate` to handle dual email response
    - Ensure grouped contact list receives contacts with contactType
    - _Requirements: 4.1, 4.5, 5.1, 6.1_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All implementation extends existing files — no new feature directories
- The Prisma migration must run before any service code that reads the new fields
- The UI tasks (11–14) can be done in parallel since they extend different components
- Backward compatibility is maintained for the bulk send API route

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "7.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "4.1", "7.2", "7.3", "7.4"] },
    { "id": 3, "tasks": ["4.2", "5.1", "5.2", "5.3"] },
    { "id": 4, "tasks": ["5.4", "5.5", "5.6", "5.7", "8.1"] },
    { "id": 5, "tasks": ["8.2", "8.3", "8.4", "10.1", "10.2", "10.3"] },
    { "id": 6, "tasks": ["11.1", "11.2", "12.1", "12.2", "13.1"] },
    { "id": 7, "tasks": ["12.3", "14.1"] }
  ]
}
```
