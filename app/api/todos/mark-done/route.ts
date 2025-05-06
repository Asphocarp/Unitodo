import { NextResponse } from 'next/server';

const RUST_BACKEND_URL = 'http://127.0.0.1:8080';

// Define the expected structure of the request body from the frontend
interface MarkDoneRequestBody {
  location: string;
  original_content: string;
}

// Handler for POST requests to mark a todo as done
export async function POST(request: Request) {
  try {
    const payload: MarkDoneRequestBody = await request.json();

    // Forward the request to the Rust backend's /mark-done endpoint
    const rustBackendMarkDoneUrl = `${RUST_BACKEND_URL}/mark-done`;
    console.log(`Forwarding mark-done request to: ${rustBackendMarkDoneUrl} with payload:`, payload);

    const response = await fetch(rustBackendMarkDoneUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store', // Ensure the request is always sent
    });

    // Read the response body once, as it might be needed for both success and error cases
    const responseText = await response.text();
    let responseData;
    try {
        responseData = JSON.parse(responseText);
    } catch (e) {
        // If responseText is not valid JSON (e.g., plain text error from backend)
        responseData = { error: "Backend returned non-JSON response", details: responseText };
    }

    if (!response.ok) {
      console.error(`Rust backend mark-done error: ${response.status} ${response.statusText}`, responseData);
      // Forward the backend error status and message using parsed responseData
      return NextResponse.json(
        { 
          error: responseData.error || 'Failed to mark todo as done via backend service', 
          details: responseData.details || 'No specific details from backend.'
        },
        { status: response.status }
      );
    }
    
    console.log("Mark-done request forwarded successfully, response from backend:", responseData);

    // Return the success response from the Rust backend to the frontend
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error processing mark-done request in API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error processing mark-done request';
    
    if (error instanceof SyntaxError) { // Handle potential JSON parsing errors from request body
        return NextResponse.json(
            { error: 'Invalid request body format for mark-done. Expected valid JSON.', details: errorMessage },
            { status: 400 } // Bad Request
        );
    }
     if (error instanceof TypeError && errorMessage.includes('fetch failed')) { // Handle network errors
        return NextResponse.json(
            { error: 'Failed to connect to the backend service to mark-done. Is it running?', details: errorMessage },
            { status: 503 } // Service Unavailable
        );
    }
    return NextResponse.json(
      { error: 'Internal server error processing mark-done request', details: errorMessage },
      { status: 500 }
    );
  }
} 