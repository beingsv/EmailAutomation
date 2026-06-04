# Requirements Document

## Introduction

The Referral Email System extends the existing AI Job Dashboard to support a dual-outreach strategy for job applications. Currently, the system discovers HR contacts and sends formal application emails. This feature adds the ability to discover tech/engineering contacts at the target company (potential referrers in the same department as the job role) and generate a separate, more casual referral request email. The system then intelligently routes the correct email template to each contact type during bulk sending — HR contacts receive the formal application email while tech contacts receive the referral request email.

## Glossary

- **Contact_Finder**: The existing subsystem responsible for discovering contacts at a given company using the Hunter.io Domain Search API and pattern-based fallback, extended to support both HR and tech contact discovery
- **Hunter_Client**: The integration layer communicating with the Hunter.io Domain Search API to find contacts by domain and department filter
- **Email_Generator**: The existing subsystem that generates tailored job application emails using AI (Ollama Cloud / Gemma 4), extended to also generate referral request emails
- **Referral_Email_Generator**: The new subsystem within Email_Generator responsible for generating casual, professional referral request emails using AI
- **Contact_Type**: A classification assigned to each discovered contact, either "hr" (for HR/recruiting contacts) or "tech" (for engineering/tech contacts in the same department as the target role)
- **HR_Contact**: A contact discovered via the Hunter.io API with department filter set to "hr", representing someone in Human Resources, Talent Acquisition, or Recruiting
- **Tech_Contact**: A contact discovered via the Hunter.io API with a department filter matching the target job role (e.g., "it", "engineering", "management"), representing a potential referrer
- **Department_Mapper**: The subsystem that maps a job role from a Job_Description to the appropriate Hunter.io department filter value for tech contact discovery
- **Smart_Sender**: The extension of the existing Bulk_Sender that routes the correct email template (HR application or referral request) to each contact based on their Contact_Type
- **Contact_List_UI**: The user interface component within the Email Generator that displays discovered contacts grouped by Contact_Type with checkboxes for multi-selection
- **Company_Cache**: The local PostgreSQL database tables (Company and CompanyContact) that store previously discovered contacts with their Contact_Type for instant retrieval
- **Bulk_Sender**: The existing subsystem that sends emails individually to each selected contact using the existing Email_Sender infrastructure
- **Email_Sender**: The existing subsystem responsible for sending emails via SMTP/Gmail (already implemented)
- **AI_Service**: The existing integration layer communicating with Ollama Cloud API using Gemma 4 (already implemented)
- **Job_Description**: A text input provided by the user describing a job posting's requirements and responsibilities
- **Hunter_Department_Filter**: One of the predefined department values supported by Hunter.io Domain Search API: executive, it, finance, management, sales, legal, support, hr, marketing, communication, education, design, health, operations

## Requirements

### Requirement 1: Tech Contact Discovery via Hunter.io

**User Story:** As a job seeker, I want the system to find tech/engineering contacts at the target company who work in the same department as my target role, so that I can ask them for a referral.

#### Acceptance Criteria

1. WHEN a user triggers a contact search with a company name and a Job_Description, THE Contact_Finder SHALL query the Hunter.io Domain Search API for both HR contacts (department=hr) and tech contacts (department matching the target role) at the specified company
2. THE Department_Mapper SHALL analyze the Job_Description and map the target role to one of the Hunter.io department filter values: executive, it, finance, management, sales, legal, support, hr, marketing, communication, education, design, health, or operations
3. WHEN the Department_Mapper cannot determine a matching department from the Job_Description, THE Department_Mapper SHALL default to the "it" department filter
4. THE Hunter_Client SHALL make two separate API calls per company search: one with department=hr and one with the department value determined by the Department_Mapper
5. THE Hunter_Client SHALL limit each search request to a maximum of 5 contacts per department to conserve API credits within the 25 searches/month free tier
6. WHEN the Hunter.io API returns tech contacts, THE Contact_Finder SHALL assign each tech contact a Contact_Type value of "tech"
7. WHEN the Hunter.io API returns HR contacts, THE Contact_Finder SHALL assign each HR contact a Contact_Type value of "hr"
8. IF the Hunter.io API returns no tech contacts for the mapped department, THEN THE Contact_Finder SHALL display a message indicating no tech contacts were found, without falling back to pattern generation for tech contacts

### Requirement 2: Contact Type Data Model Extension

**User Story:** As a developer, I want the CompanyContact table to store a contact type field, so that the system can distinguish between HR and tech contacts for template routing.

#### Acceptance Criteria

1. THE Company_Cache SHALL store a contactType field on each CompanyContact record with a value of either "hr" or "tech"
2. THE Company_Cache SHALL store a department field on each CompanyContact record containing the Hunter.io department value used to discover the contact (e.g., "hr", "it", "management")
3. WHEN contacts are retrieved from the Company_Cache, THE Contact_Finder SHALL include the contactType and department fields in the returned contact data
4. THE Company_Cache SHALL support querying contacts filtered by contactType for a given company
5. THE existing CompanyContact records without a contactType value SHALL be treated as "hr" contacts by default

### Requirement 3: Referral Email Generation

**User Story:** As a job seeker, I want the system to generate a casual, professional referral request email, so that I can ask tech contacts for a referral without sounding too formal.

#### Acceptance Criteria

1. WHEN a user provides a Job_Description and has a stored resume, THE Referral_Email_Generator SHALL generate a referral request email that is distinct from the HR application email
2. THE Referral_Email_Generator SHALL generate the referral email with a casual, professional tone that mentions shared technical background and asks for a referral for the specific role
3. THE Referral_Email_Generator SHALL include in the referral email: the specific role being applied for, 3-5 relevant technical skills from the resume that match the Job_Description, a brief mention of current experience level, and a clear ask for a referral
4. THE Referral_Email_Generator SHALL generate the referral email subject line in a format that is informal and personalized (e.g., "Quick question about the [Role] opening at [Company]")
5. THE Referral_Email_Generator SHALL keep the referral email body concise, limited to 150 words maximum, to respect the recipient's time
6. THE Referral_Email_Generator SHALL use the AI_Service (Ollama Cloud / Gemma 4) to generate the referral email, using the same Job_Description and resume as inputs
7. IF the AI_Service is unavailable during referral email generation, THEN THE Referral_Email_Generator SHALL display an error message and allow the user to retry

### Requirement 4: Dual Email Template Display

**User Story:** As a job seeker, I want to see both the HR application email and the referral request email side by side, so that I can review and edit both before sending.

#### Acceptance Criteria

1. WHEN both emails are generated, THE Email_Generator page SHALL display the HR application email and the referral request email in a tabbed or side-by-side view
2. THE Email_Generator page SHALL clearly label each email template with its type: "HR Application Email" and "Referral Request Email"
3. THE Email_Generator page SHALL allow the user to edit both email templates before sending
4. WHEN the user edits an email template, THE Email_Generator page SHALL preserve the edits until a new generation is triggered or the page is refreshed
5. THE Email_Generator page SHALL generate both emails from a single "Generate" button click using the same Job_Description and resume
6. WHILE the emails are being generated, THE Email_Generator page SHALL display a loading indicator for each email template independently

### Requirement 5: Contact List Grouped by Type

**User Story:** As a job seeker, I want to see contacts grouped by type (HR vs Tech) in the contact list, so that I can understand who will receive which email template.

#### Acceptance Criteria

1. WHEN contacts are available, THE Contact_List_UI SHALL display contacts in two visually distinct groups: "HR Contacts" and "Tech Contacts"
2. THE Contact_List_UI SHALL display a badge on each contact row indicating the Contact_Type ("HR" or "Tech") using distinct colors
3. THE Contact_List_UI SHALL display a label under each group heading indicating which email template will be sent to that group (e.g., "Will receive: HR Application Email")
4. THE Contact_List_UI SHALL allow the user to select contacts from both groups independently using per-contact checkboxes
5. THE Contact_List_UI SHALL provide a "Select All" checkbox within each group that toggles selection of all contacts in that group
6. THE Contact_List_UI SHALL display the total count of selected contacts across both groups next to the "Send to Selected" button
7. WHEN no tech contacts are found, THE Contact_List_UI SHALL display the HR contacts group only and hide the empty Tech Contacts group

### Requirement 6: Smart Email Routing During Bulk Send

**User Story:** As a job seeker, I want the system to automatically send the correct email template to each contact based on their type, so that HR contacts get my formal application and tech contacts get my referral request.

#### Acceptance Criteria

1. WHEN a user clicks "Send to Selected" with contacts from both groups selected, THE Smart_Sender SHALL send the HR application email to all selected HR_Contacts and the referral request email to all selected Tech_Contacts
2. THE Smart_Sender SHALL determine which email template to use for each recipient based solely on the Contact_Type field of the contact record
3. THE Smart_Sender SHALL send emails sequentially (one at a time) to avoid SMTP rate limiting, interleaving HR and tech recipients in selection order
4. WHEN all emails are sent, THE Smart_Sender SHALL display a summary showing: total HR emails sent, total referral emails sent, total failures, and per-recipient status
5. IF one or more emails fail to send, THEN THE Smart_Sender SHALL continue sending to remaining recipients and report failures individually
6. WHILE the Smart_Sender is sending emails, THE Contact_List_UI SHALL display a progress indicator showing the current recipient, their Contact_Type, and position in the queue (e.g., "Sending 2 of 7 — Tech contact")
7. THE Smart_Sender SHALL reuse the existing Email_Sender service and SMTP configuration for all outbound emails

### Requirement 7: Department Mapping from Job Description

**User Story:** As a job seeker, I want the system to automatically determine the correct department for tech contact discovery based on my target job role, so that I get relevant referral contacts.

#### Acceptance Criteria

1. THE Department_Mapper SHALL use the AI_Service to analyze the Job_Description and determine the most appropriate Hunter.io department filter value from the supported list: executive, it, finance, management, sales, legal, support, hr, marketing, communication, education, design, health, operations
2. WHEN the Job_Description contains a role related to software engineering, web development, data science, DevOps, QA, or IT infrastructure, THE Department_Mapper SHALL return "it" as the department value
3. WHEN the Job_Description contains a role related to graphic design, UX design, or product design, THE Department_Mapper SHALL return "design" as the department value
4. WHEN the Job_Description contains a role related to sales, business development, or account management, THE Department_Mapper SHALL return "sales" as the department value
5. WHEN the Job_Description contains a role related to marketing, content, SEO, or growth, THE Department_Mapper SHALL return "marketing" as the department value
6. THE Department_Mapper SHALL return a single department value per Job_Description, selecting the most relevant match
7. THE Department_Mapper SHALL cache the mapped department value alongside the company search results to avoid re-analysis on subsequent searches for the same Job_Description

### Requirement 8: API Credit Optimization for Dual Search

**User Story:** As a job seeker, I want the system to minimize Hunter.io API usage when searching for both HR and tech contacts, so that I do not exhaust my 25 monthly searches quickly.

#### Acceptance Criteria

1. THE Contact_Finder SHALL check the Company_Cache for both HR and tech contacts before making any Hunter.io API calls, using cached results if contacts of both types exist
2. WHEN the cache contains only HR contacts for a company, THE Contact_Finder SHALL make a single API call for tech contacts only, and update the cache with the new tech contacts
3. WHEN the cache contains only tech contacts for a company, THE Contact_Finder SHALL make a single API call for HR contacts only, and update the cache with the new HR contacts
4. THE Hunter_Client SHALL count each domain search API call (regardless of department filter) as consuming one search credit from the 25 monthly allowance
5. WHEN the user refreshes contacts for a company, THE Contact_Finder SHALL clear both HR and tech contacts from the cache and make two fresh API calls (one per department)
6. THE Contact_Finder SHALL log each Hunter.io API call with the company name, department filter, and timestamp for monitoring credit usage

