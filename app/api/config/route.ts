import { NextResponse } from 'next/server';
import { Config } from '@/app/types'; // Use path alias if configured, otherwise adjust path

const RUST_BACKEND_URL = 'http://127.0.0.1:8080';

// Handler for GET requests to fetch config
export async function GET() {
  try {
    const backendConfigUrl = `${RUST_BACKEND_URL}/config`;
    console.log(`Forwarding GET request to: ${backendConfigUrl}`);

    const response = await fetch(backendConfigUrl, {
      cache: 'no-store', // Ensure fresh data is fetched every time
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Rust backend error fetching config: ${response.status} ${response.statusText}`, errorText);
      // Forward the backend error status and message if possible
      return NextResponse.json(
        { error: 'Failed to fetch config from backend service', details: errorText },
        { status: response.status }
      );
    }

    const data: Config = await response.json();
    console.log("Config fetched successfully from Rust backend.");

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error forwarding GET /config request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Handle network errors specifically
    if (error instanceof TypeError) {
        return NextResponse.json(
            { error: 'Failed to connect to the backend service. Is it running?', details: errorMessage },
            { status: 503 } // Service Unavailable
        );
    }
    return NextResponse.json(
      { error: 'Internal server error fetching config', details: errorMessage },
      { status: 500 }
    );
  }
}

// Handler for POST requests to update config
export async function POST(request: Request) {
  try {
    const payload: Config = await request.json();

    const backendConfigUrl = `${RUST_BACKEND_URL}/config`;
    console.log(`Forwarding POST request to: ${backendConfigUrl}`);

    const response = await fetch(backendConfigUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store', // Ensure the request is always sent
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Rust backend error updating config: ${response.status} ${response.statusText}`, errorText);
      // Forward the backend error status and message if possible
      return NextResponse.json(
        { error: 'Failed to update config via backend service', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Config update request forwarded successfully.");

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error forwarding POST /config request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof SyntaxError) { // Handle potential JSON parsing errors from request body
        return NextResponse.json(
            { error: 'Invalid request body format. Expected valid JSON.', details: errorMessage },
            { status: 400 } // Bad Request
        );
    }
     if (error instanceof TypeError) {
        return NextResponse.json(
            { error: 'Failed to connect to the backend service to update config. Is it running?', details: errorMessage },
            { status: 503 } // Service Unavailable
        );
    }
    return NextResponse.json(
      { error: 'Internal server error updating config', details: errorMessage },
      { status: 500 }
    );
  }
} 