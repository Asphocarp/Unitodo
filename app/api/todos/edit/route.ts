import { NextResponse } from 'next/server';

// Define the expected structure of the request body from the frontend
interface EditTodoRequestBody {
  location: string;
  new_content: string;
  completed: boolean;
}

export async function POST(request: Request) {
  try {
    const payload: EditTodoRequestBody = await request.json();

    // Forward the request to the Rust backend's /edit-todo endpoint
    const rustBackendUrl = 'http://127.0.0.1:8080/edit-todo';
    console.log(`Forwarding edit request to: ${rustBackendUrl}`);

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
      console.error(`Rust backend edit error: ${response.status} ${response.statusText}`, errorText);
      // Forward the backend error status and message if possible
      return NextResponse.json(
        { error: 'Failed to edit todo via backend service', details: errorText },
        { status: response.status }
      );
    }

    // Parse the success response from the Rust backend
    const data = await response.json();
    console.log("Edit request successful.");

    // Return the success response to the frontend
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error processing edit request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error processing edit request';
    return NextResponse.json(
      { error: 'Internal server error processing edit request', details: errorMessage },
      { status: 500 }
    );
  }
} 