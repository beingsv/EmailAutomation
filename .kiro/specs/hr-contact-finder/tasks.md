# Implementation Plan: HR Contact Finder

## Overview

This plan implements the HR Contact Finder feature incrementally, starting with database schema and core services, then building up through the orchestration layer, API routes, and finally the UI integration. Each task builds on the previous ones, ensuring no orphaned code. The implementation uses TypeScript throughout, following the existing feature-based directory structure.

## Tasks

- [x] 1. Set up feature directory structure and shared types
  - [x] 1.1 Create the feature directory and define TypeScript interfaces
    - Create `src/features/hr-contact-finder/types.ts` with all shared interfaces: `Contact`, `Company`, `FindContactsParams`, `FindContactsResult`, `ApolloSearchParams`, `ApolloSearchResult`, `ApolloContact`, `BulkSendParams`, `BulkSendProgress`, `BulkSendResult`, `ContactSearchRequest`, `ContactSearchResponse`, `BulkSendRequest`, `BulkSendProgressEvent`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2. Database schema and migration
  - [x] 2.1 Add Company and CompanyContact models to Prisma schema
    - Add `Company` model with fields: `id` (cuid), `name` (unique), `domain`, `createdAt`
    - Add `CompanyContact` model with fields: `id` (cuid), `companyId`, `name`, `title`, `email` (unique), `source`, `cachedAt`
    - Add relation from CompanyContact to Company with `onDelete: Cascade`
    - Add `@@index([companyId])` on CompanyContact
    - Run `npx prisma generate` to update the Prisma client
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 3. Implement Pattern Generator service
  - [x] 3.1 Create the pattern generator service
    - Create `src/features/hr-contact-finder/services/pattern-generator.service.ts`
    - Implement `generatePatterns(domain: string): Contact[]` that produces 5 contacts: hr@, careers@, recruiting@, jobs@, talent@ with source "pattern"
    - Implement `deriveDomain(companyName: string): string | null` that lowercases, removes suffixes (Inc, LLC, Ltd, Corp), removes spaces, appends ".com", returns null if empty
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [ ]* 3.2 Write property tests for Pattern Generator
    - **Property 5: Pattern generation produces correct emails with correct source**
    - **Property 6: Domain derivation from company name**
    - **Validates: Requirements 4.2, 4.3, 4.5**

- [x] 4. Implement Company Extractor service
  - [x] 4.1 Create the company extractor service
    - Create `src/features/hr-contact-finder/services/company-extractor.service.ts`
    - Implement `extractCompanyName(jobDescription: string): Promise<string | null>` using the existing `generateCompletion` from `src/features/ai-service/services/ai.service.ts`
    - Implement `sanitizeCompanyName(raw: string): string` that trims whitespace and removes characters not matching alphanumeric, spaces, hyphens, ampersands, periods, commas
    - Wrap AI call in try/catch, return null on any failure
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

  - [ ]* 4.2 Write property test for company name sanitization
    - **Property 1: Company name sanitization preserves valid characters**
    - **Validates: Requirements 1.5**

- [x] 5. Implement Apollo.io Client service
  - [x] 5.1 Create the Apollo.io client service
    - Create `src/features/hr-contact-finder/services/apollo-client.service.ts`
    - Implement `searchPeople(params: ApolloSearchParams): Promise<ApolloSearchResult>` that calls the Apollo.io People Search API
    - Use `APOLLO_API_KEY` environment variable for authentication
    - Enforce 15-second timeout via AbortController
    - Limit results to max 10 contacts per request
    - Handle HTTP 429 (rate limit) and 402 (credits exhausted) with specific error codes
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 8.2, 8.3_

  - [ ]* 5.2 Write property test for Apollo response extraction
    - **Property 2: Apollo response extraction completeness**
    - **Validates: Requirements 2.3**

- [x] 6. Checkpoint - Core services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Contact Finder service (orchestrator)
  - [x] 7.1 Create the contact finder service
    - Create `src/features/hr-contact-finder/services/contact-finder.service.ts`
    - Implement `findContacts(params: FindContactsParams): Promise<FindContactsResult>` with the flow: extract company name (if needed) → check cache → call Apollo → fallback to patterns
    - Implement `refreshContacts(companyName: string): Promise<FindContactsResult>` that bypasses cache
    - Use Prisma client for cache reads/writes with case-insensitive company name lookup (`.toLowerCase()` normalization)
    - Log each Apollo.io API call with company name and timestamp
    - On cache write failure, log error but still return contacts to user
    - _Requirements: 1.1, 1.2, 2.4, 3.1, 3.2, 3.5, 3.6, 8.1, 8.4_

  - [ ]* 7.2 Write property tests for Contact Finder caching behavior
    - **Property 3: Cache-first behavior prevents redundant API calls**
    - **Property 4: Case-insensitive company cache lookup**
    - **Validates: Requirements 3.2, 3.6, 8.1**

- [x] 8. Implement Bulk Sender service
  - [x] 8.1 Create the bulk sender service
    - Create `src/features/hr-contact-finder/services/bulk-sender.service.ts`
    - Implement `sendToMultiple(params: BulkSendParams): AsyncGenerator<BulkSendProgress>` that sends emails sequentially using the existing `sendEmail` from `src/features/email/services/email-sender.service.ts`
    - Yield progress events after each send attempt (success or failure)
    - Continue sending even if individual emails fail
    - Return complete summary with totalSent, totalFailed, and per-recipient results
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7_

  - [ ]* 8.2 Write property tests for Bulk Sender
    - **Property 9: Bulk sender invokes email sender exactly once per recipient**
    - **Property 10: Bulk send summary accuracy**
    - **Property 11: Progress indicator accuracy**
    - **Validates: Requirements 6.1, 6.3, 6.4, 6.5**

- [x] 9. Checkpoint - All services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement API routes
  - [x] 10.1 Create the contact search API route
    - Create `src/app/api/contacts/search/route.ts`
    - Implement POST handler that accepts `ContactSearchRequest` body
    - Authenticate request using existing NextAuth session check
    - Call `findContacts` or `refreshContacts` based on `refresh` flag
    - Return `ContactSearchResponse` with contacts, companyName, domain, source
    - Handle errors with appropriate HTTP status codes (429, 402, 500, 502, 504)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.5, 3.2, 3.5_

  - [x] 10.2 Create the bulk send API route
    - Create `src/app/api/email/send-bulk/route.ts`
    - Implement POST handler that accepts `BulkSendRequest` body
    - Authenticate request using existing NextAuth session check
    - Use ReadableStream to stream `BulkSendProgressEvent` objects as newline-delimited JSON
    - Call `sendToMultiple` and pipe each yielded progress event to the stream
    - Send final "complete" event with summary
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11. Implement the useContactFinder hook
  - [x] 11.1 Create the client-side React hook
    - Create `src/features/hr-contact-finder/hooks/useContactFinder.ts`
    - Implement `useContactFinder()` hook returning: contacts, isSearching, isSending, sendProgress, sendResults, error, companyName, selectedContacts
    - Implement `searchContacts` that calls `/api/contacts/search`
    - Implement `refreshContacts` that calls `/api/contacts/search` with `refresh: true`
    - Implement `toggleContact`, `toggleAll`, `sendToSelected` (reads streamed response), `setCompanyName`, `clearResults`
    - Parse streamed bulk send response and update progress state in real-time
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 6.5, 6.6_

- [x] 12. Implement UI components
  - [x] 12.1 Create the ContactSearchBar component
    - Create `src/features/hr-contact-finder/components/ContactSearchBar.tsx`
    - Render a company name text input (pre-populated if AI extracted it) and a "Find HR Contacts" button
    - Show loading spinner with "Searching for contacts..." text while searching
    - Match existing dark-mode theme (gray-900 bg, gray-800 borders, white text)
    - _Requirements: 1.2, 5.7, 5.8_

  - [x] 12.2 Create the ContactList component
    - Create `src/features/hr-contact-finder/components/ContactList.tsx`
    - Render each contact as a row with checkbox, name, title, email, and source badge ("Apollo" or "Pattern")
    - Include "Select All" checkbox in header
    - Show selected count and "Send to Selected" button (disabled when none selected)
    - Include "Refresh Contacts" button to re-fetch from Apollo
    - Disable checkboxes and send button while sending
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.6_

  - [x] 12.3 Create the BulkSendProgress component
    - Create `src/features/hr-contact-finder/components/BulkSendProgress.tsx`
    - Display "Sending X of Y..." progress text during bulk send
    - Show final summary with success/failure counts and per-recipient status
    - _Requirements: 6.3, 6.4, 6.5_

  - [x] 12.4 Create the ContactSourceBadge component
    - Create `src/features/hr-contact-finder/components/ContactSourceBadge.tsx`
    - Render a small badge indicating "Apollo" (blue) or "Pattern" (yellow) source
    - _Requirements: 5.1_

  - [ ]* 12.5 Write property tests for Contact display and Selection state
    - **Property 7: Contact display contains all required fields**
    - **Property 8: Selection state consistency**
    - **Validates: Requirements 5.1, 5.3, 5.5**

- [x] 13. Integrate into Email Generator page
  - [x] 13.1 Wire HR Contact Finder into the existing Email Generator page
    - Modify `src/app/(dashboard)/email-generator/page.tsx` to import and render the ContactSearchBar, ContactList, and BulkSendProgress components
    - Use the `useContactFinder` hook alongside the existing `useEmailGenerator` hook
    - Pass the job description from the email form to `searchContacts` for AI-based company extraction
    - Pass the generated email subject and body to `sendToSelected`
    - Position the contact finder section below the email preview or in a collapsible panel
    - _Requirements: 1.2, 5.6, 6.1_

- [~] 14. Final checkpoint - Full integration complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `sendEmail` service already handles resume attachment, so the Bulk Sender inherits this behavior
- All new code follows the feature-based directory structure under `src/features/hr-contact-finder/`
- The `APOLLO_API_KEY` environment variable must be configured before Apollo.io integration works

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["3.1", "4.1", "5.1"] },
    { "id": 2, "tasks": ["3.2", "4.2", "5.2"] },
    { "id": 3, "tasks": ["7.1", "8.1"] },
    { "id": 4, "tasks": ["7.2", "8.2"] },
    { "id": 5, "tasks": ["10.1", "10.2"] },
    { "id": 6, "tasks": ["11.1"] },
    { "id": 7, "tasks": ["12.1", "12.2", "12.3", "12.4"] },
    { "id": 8, "tasks": ["12.5", "13.1"] }
  ]
}
```
