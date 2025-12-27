import React from 'react';

const Loading = () => (
  <div className="flex flex-col items-center justify-center p-12 space-y-4">
    <div className="relative w-12 h-12">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
      <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
    </div>
    <p className="text-gray-400 font-medium text-sm animate-pulse">Matching Colors...</p>
  </div>
);

export default Loading;