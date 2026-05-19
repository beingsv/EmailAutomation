# Requirements Document

## Introduction

The HR Contact Finder is a feature extension to the existing AI Job Dashboard that automates the discovery of HR and Talent Acquisition contacts at target companies. The feature integrates with the Apollo.io API to search for relevant contacts, caches results in a local PostgreSQL database for instant future lookups, and provides a multi-select UI within the existing Email Generator for bulk email sending. The system uses AI (Ollama Cloud API with Gemma 4) to extract company names from job descriptions and falls back to pattern-based email guessing when Apollo.io returns no results.

## Glossary

- **Contact_Finder**: The subsystem responsible for discovering HR and Talent Acquisition contacts at a given company using the Apollo.io API and pattern-based fallback
- **Company_Cache**: The local PostgreSQL database tables (Company and CompanyContact) that store previously discovered contacts for instant retrieval
- **Apollo_Client**: The integration layer communicating with the Apollo.io People Search API to find contacts by company and job title
- **Company_Extractor**: The AI-powered subsystem that extracts a company name from a Job_Description using the AI_Service (Ollama Cloud API, Gemma 4)
- **Contact_List_UI**: The user interface component within the Email Generator that displays discovered contacts with checkboxes for multi-selection
- **Bulk_Sender**: The subsystem that sends the same generated email individually to each selected contact using the existing Email_Sender infrastructure
- **Pattern_Generator**: The fallback subsystem that generates common HR email patterns (e.g., hr@company.com, careers@company.com) when Apollo.io returns no results
- **Company**: A database entity representing a company with its name and domain
- **CompanyContact**: A database entity representing an HR or recruiting contact associated with a Company
- **Email_Generator**: The existing subsystem that generates tailored job application emails using AI (already implemented)
- **Email_Sender**: The existing subsystem responsible for sending emails via SMTP/Gmail (already implemented)
- **AI_Service**: The existing integration layer communicating with Ollama Cloud API (already implemented)
- **Job_Description**: A text input provided by the user describing a job posting's requirements and responsibilities

## Requirements

### Requirement 1: Company Name Extraction from Job Description

**User Story:** As a job seeker, I want the system to automatically identify the company name from a pasted job description, so that I do not have to manually type it when searching for HR contacts.

#### Acceptance Criteria

1. WHEN a user provides a Job_Description containing a company name, THE Company_Extractor SHALL use the AI_Service to extract the company name and return it within 10 seconds
2. WHEN the Company_Extractor successfully identifies a company name, THE Contact_Finder SHALL pre-populate the company name field in the Contact_List_UI
3. IF the AI_Service cannot identify a company name from the Job_Description, THEN THE Company_Extractor SHALL leave the company name field empty and display a prompt asking the user to enter the company name manually
4. IF the AI_Service is unavailable, THEN THE Company_Extractor SHALL display a notice that auto-detection is unavailable and allow the user to enter the company name manually
5. THE Company_Extractor SHALL sanitize the extracted company name by trimming whitespace and removing special characters that are not part of standard company names

### Requirement 2: Apollo.io Contact Search

**User Story:** As a job seeker, I want the system to find HR and recruiting contacts at a target company, so that I can send my application to the right people.

#### Acceptance Criteria

1. WHEN a user triggers a contact search with a company name, THE Apollo_Client SHALL query the Apollo.io People Search API for contacts with HR, Talent Acquisition, or Recruiting job titles at the specified company
2. THE Apollo_Client SHALL authenticate requests to the Apollo.io API using the configured API key stored as an environment variable (APOLLO_API_KEY)
3. WHEN the Apollo.io API returns results, THE Contact_Finder SHALL extract the contact name, job title, and email address from each result
4. IF the Apollo.io API returns no results for the specified company, THEN THE Contact_Finder SHALL invoke the Pattern_Generator to provide fallback email addresses
5. IF the Apollo.io API returns an error or is unreachable, THEN THE Contact_Finder SHALL display an error message to the user and offer the pattern-based fallback as an alternative
6. THE Apollo_Client SHALL limit each search request to a maximum of 10 contacts per company to conserve API credits
7. THE Apollo_Client SHALL enforce a request timeout of 15 seconds for each API call to the Apollo.io API

### Requirement 3: Contact Caching

**User Story:** As a job seeker, I want previously found contacts to load instantly from a local cache, so that I do not waste API credits or wait for repeated lookups.

#### Acceptance Criteria

1. WHEN the Contact_Finder retrieves contacts for a company (from Apollo.io or Pattern_Generator), THE Company_Cache SHALL store the company record and all associated contacts in the local PostgreSQL database
2. WHEN a user searches for contacts at a company that already exists in the Company_Cache, THE Contact_Finder SHALL return the cached contacts without calling the Apollo.io API
3. THE Company_Cache SHALL store for each contact: full name, job title, email address, source (apollo or pattern), and the timestamp when the contact was cached
4. THE Company_Cache SHALL store for each company: company name, domain, and the timestamp when the company record was created
5. WHEN a user clicks the "Refresh Contacts" button for a cached company, THE Contact_Finder SHALL bypass the cache, query the Apollo.io API again, and replace the existing cached contacts with the new results
6. THE Company_Cache SHALL perform company lookups using case-insensitive matching on the company name

### Requirement 4: Pattern-Based Email Fallback

**User Story:** As a job seeker, I want the system to suggest common HR email patterns when no contacts are found via Apollo.io, so that I still have options to reach out.

#### Acceptance Criteria

1. WHEN the Apollo.io API returns no contacts for a company, THE Pattern_Generator SHALL generate a list of common HR email addresses using the company domain
2. THE Pattern_Generator SHALL generate the following email patterns: hr@{domain}, careers@{domain}, recruiting@{domain}, jobs@{domain}, and talent@{domain}
3. WHEN the Pattern_Generator creates fallback contacts, THE Contact_Finder SHALL mark each contact with a source value of "pattern" to distinguish them from Apollo.io-sourced contacts
4. IF the company domain cannot be determined from the company name, THEN THE Pattern_Generator SHALL prompt the user to enter the company domain manually
5. THE Pattern_Generator SHALL derive the company domain by converting the company name to lowercase, removing common suffixes (Inc, LLC, Ltd, Corp), replacing spaces with nothing, and appending ".com"

### Requirement 5: Contact List UI with Multi-Select

**User Story:** As a job seeker, I want to see a list of HR contacts with checkboxes so that I can select multiple recipients for my application email.

#### Acceptance Criteria

1. WHEN contacts are available for a company, THE Contact_List_UI SHALL display each contact as a selectable row showing the contact name, job title, email address, and source indicator (Apollo or Pattern)
2. THE Contact_List_UI SHALL provide a checkbox for each contact row allowing the user to select or deselect individual contacts
3. THE Contact_List_UI SHALL provide a "Select All" checkbox that toggles selection of all displayed contacts
4. WHEN no contacts are selected, THE Contact_List_UI SHALL disable the "Send to Selected" button
5. THE Contact_List_UI SHALL display the count of currently selected contacts next to the "Send to Selected" button
6. THE Contact_List_UI SHALL integrate visually with the existing Email Generator dark-mode theme using consistent colors, borders, and typography
7. WHEN contacts are loading, THE Contact_List_UI SHALL display a loading spinner with the text "Searching for contacts..."
8. THE Contact_List_UI SHALL provide a "Find HR Contacts" button that triggers the contact search flow

### Requirement 6: Bulk Email Sending to Selected Contacts

**User Story:** As a job seeker, I want to send the same application email to all selected HR contacts at once, so that I can maximize my chances without repeating the send process.

#### Acceptance Criteria

1. WHEN a user clicks "Send to Selected" with one or more contacts selected, THE Bulk_Sender SHALL send the generated email individually to each selected contact using the existing Email_Sender service
2. THE Bulk_Sender SHALL send emails sequentially (one at a time) to avoid SMTP rate limiting
3. WHEN all emails are sent successfully, THE Bulk_Sender SHALL display a summary showing the total number of emails sent and the list of recipient email addresses
4. IF one or more emails fail to send, THEN THE Bulk_Sender SHALL display a partial success summary listing which recipients succeeded and which failed, with the failure reason
5. WHILE the Bulk_Sender is sending emails, THE Contact_List_UI SHALL display a progress indicator showing the current send status (e.g., "Sending 2 of 5...")
6. WHILE the Bulk_Sender is sending emails, THE Contact_List_UI SHALL disable the "Send to Selected" button and contact checkboxes to prevent duplicate sends
7. THE Bulk_Sender SHALL attach the user's resume to each sent email, consistent with the existing Email_Sender behavior

### Requirement 7: Database Schema for Contact Storage

**User Story:** As a developer, I want a well-structured database schema for companies and contacts, so that cached data is efficiently stored and queried.

#### Acceptance Criteria

1. THE Company_Cache SHALL store Company records with the following fields: unique identifier, company name, company domain, and creation timestamp
2. THE Company_Cache SHALL store CompanyContact records with the following fields: unique identifier, reference to the parent Company, full name, job title, email address, source (apollo or pattern), and creation timestamp
3. THE Company_Cache SHALL enforce a unique constraint on the company name field (case-insensitive) to prevent duplicate company records
4. THE Company_Cache SHALL enforce a unique constraint on the email address field within the CompanyContact table to prevent duplicate contact records
5. THE Company_Cache SHALL cascade-delete all CompanyContact records when a parent Company record is deleted
6. THE Company_Cache SHALL use the existing Prisma ORM and PostgreSQL database infrastructure without requiring a separate database connection

### Requirement 8: Apollo.io API Credit Management

**User Story:** As a job seeker, I want the system to use API credits efficiently, so that I do not exhaust my monthly Apollo.io allowance unnecessarily.

#### Acceptance Criteria

1. THE Contact_Finder SHALL check the Company_Cache before making any Apollo.io API call, using the cached result if available
2. THE Apollo_Client SHALL limit each people search request to return a maximum of 10 contacts to minimize credit consumption per search
3. WHEN the Apollo.io API returns an HTTP 429 (rate limit) or HTTP 402 (credits exhausted) response, THE Apollo_Client SHALL display a message to the user indicating that the API limit has been reached and offer the pattern-based fallback
4. THE Contact_Finder SHALL log each Apollo.io API call with the company name and timestamp for monitoring credit usage
