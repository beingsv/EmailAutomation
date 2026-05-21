/**
 * Contact Search API Route
 * POST /api/contacts/search
 *
 * Searches for HR/recruiting contacts at a target company using
 * Hunter.io API with cache-first strategy and pattern-based fallback.
 *
 * Request body: ContactSearchRequest { companyName?, jobDescription?, domain?, refresh? }
 * Success response: ContactSearchResponse { contacts, companyName, domain, source, extractedCompanyName? }
 * Error responses: 401 (unauthorized), 402 (credits exhausted), 429 (rate limit), 500 (config/internal), 502 (API error), 504 (timeout)
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.5, 3.2, 3.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { findContacts, refreshContacts } from '@/features/hr-contact-finder/services/contact-finder.service';
import { ApolloClientError } from '@/features/hr-contact-finder/services/hunter-client.service';
import { AppError, handleApiError } from '@/shared/lib/errors';
import type { ContactSearchRequest, ContactSearchResponse } from '@/features/hr-contact-finder/types';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    // Parse request body
    let body: ContactSearchRequest;
    try {
      body = await request.json();
    } catch {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        statusCode: 400,
      });
    }

    const { companyName, jobDescription, domain, refresh, location } = body;

    // Validate that at least one search parameter is provided
    if (!companyName && !jobDescription) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Either companyName or jobDescription is required',
        statusCode: 400,
      });
    }

    // Call the appropriate service method based on refresh flag
    let result;
    if (refresh && companyName) {
      result = await refreshContacts(companyName);
    } else {
      result = await findContacts({ companyName, jobDescription, domain, location });
    }

    // Build response
    const response: ContactSearchResponse = {
      contacts: result.contacts,
      companyName: result.companyName,
      domain: result.domain,
      source: result.source,
    };

    // If company name was extracted from job description (not provided by user),
    // include it as extractedCompanyName
    if (!companyName && result.companyName) {
      response.extractedCompanyName = result.companyName;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Handle Hunter.io specific errors with appropriate HTTP status codes
    if (error instanceof ApolloClientError) {
      return handleHunterError(error);
    }

    return handleApiError(error);
  }
}

/**
 * Maps Hunter client error codes to appropriate HTTP status codes and messages.
 */
function handleHunterError(error: ApolloClientError): NextResponse {
  switch (error.code) {
    case 'MISSING_API_KEY':
      return NextResponse.json(
        { error: 'Contact search is not configured', code: 'MISSING_API_KEY' },
        { status: 500 }
      );
    case 'RATE_LIMITED':
      return NextResponse.json(
        { error: 'API limit reached for today', code: 'RATE_LIMITED' },
        { status: 429 }
      );
    case 'CREDITS_EXHAUSTED':
      return NextResponse.json(
        { error: 'API credits exhausted', code: 'CREDITS_EXHAUSTED' },
        { status: 402 }
      );
    case 'NETWORK_ERROR':
      // Check if it's a timeout (statusCode 504) or generic network error
      if (error.statusCode === 504) {
        return NextResponse.json(
          { error: 'Contact search timed out', code: 'TIMEOUT' },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: 'Contact search failed', code: 'NETWORK_ERROR' },
        { status: 502 }
      );
    case 'API_ERROR':
      return NextResponse.json(
        { error: 'Contact search failed', code: 'API_ERROR' },
        { status: 502 }
      );
    default:
      return NextResponse.json(
        { error: 'Contact search failed', code: 'UNKNOWN_ERROR' },
        { status: 502 }
      );
  }
}
