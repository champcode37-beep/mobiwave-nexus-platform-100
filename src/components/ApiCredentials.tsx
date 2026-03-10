import React from 'react';

export function ApiCredentials() {
  try {
    return (
      <div>
        <p className="text-gray-600">API Credentials management coming soon.</p>
      </div>
    );
  } catch (error) {
    console.error('Error rendering ApiCredentials:', error);
    return <div>Error rendering API Credentials</div>;
  }
}