import { NextResponse } from 'next/server';

const RUST_BACKEND_URL = 'http://127.0.0.1:8080';

// Define the expected structure of the request body from the frontend
interface AddTodoRequestBody {
  category_type: string;
  category_name: string;
  content: string;
  example_item_location?: string;
}

// Handler for POST requests to add a new todo
export async function POST(request: Request) {
  try {
    const payload: AddTodoRequestBody = await request.json();

    // Forward the request to the Rust backend's /add-todo endpoint
    const rustBackendUrl = `${RUST_BACKEND_URL}/add-todo`;
    console.log(`Forwarding add request to: ${rustBackendUrl} with payload:`, payload);

    const response = await fetch(rustBackendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store', // Ensure the request is always sent
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Rust backend add error: ${response.status} ${response.statusText}`, errorText);
      // Forward the backend error status and message if possible
      try {
         // Attempt to parse backend JSON error response
         const errorJson = JSON.parse(errorText);
         return NextResponse.json(
             { error: errorJson.error || 'Failed to add todo via backend service', details: errorJson.details || errorText },
             { status: response.status }
         );
      } catch (parseError) {
          // If backend response wasn't JSON, return the raw text
          return NextResponse.json(
            { error: 'Failed to add todo via backend service', details: errorText },
            { status: response.status }
          );
      }
    }

    // Parse the success response from the Rust backend
    const data = await response.json();
    console.log("Add request forwarded successfully.");

    // Return the success response to the frontend
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error processing add request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error processing add request';
     if (error instanceof SyntaxError) { // Handle potential JSON parsing errors from request body
        return NextResponse.json(
            { error: 'Invalid request body format. Expected valid JSON.', details: errorMessage },
            { status: 400 } // Bad Request
        );
    }
     if (error instanceof TypeError && errorMessage.includes('fetch failed')) { // Handle network errors
        return NextResponse.json(
            { error: 'Failed to connect to the backend service to add todo. Is it running?', details: errorMessage },
            { status: 503 } // Service Unavailable
        );
    }
    return NextResponse.json(
      { error: 'Internal server error processing add request', details: errorMessage },
      { status: 500 }
    );
  }
} 