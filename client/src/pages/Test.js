import React, { useState, useEffect } from 'react';
import { supabase } from '../App';

const Test = () => {
  const [testResults, setTestResults] = useState({
    database: false,
    auth: false,
    components: false
  });

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    try {
      // Test database connection
      const { data: books, error: booksError } = await supabase
        .from('books')
        .select('*')
        .limit(1);

      if (!booksError) {
        setTestResults(prev => ({ ...prev, database: true }));
      }

      // Test authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!authError) {
        setTestResults(prev => ({ ...prev, auth: true }));
      }

      // Test components
      const components = [
        'BookDetails',
        'Profile',
        'PDFReader',
        'BookCatalog',
        'MyShelf'
      ];

      const componentTests = components.map(component => {
        try {
          require(`./${component}`);
          return true;
        } catch (error) {
          console.error(`Error loading ${component}:`, error);
          return false;
        }
      });

      if (componentTests.every(test => test)) {
        setTestResults(prev => ({ ...prev, components: true }));
      }
    } catch (error) {
      console.error('Error running tests:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Component Test Results
            </h1>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className={`h-4 w-4 rounded-full mr-3 ${
                  testResults.database ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-gray-700">Database Connection</span>
              </div>
              <div className="flex items-center">
                <div className={`h-4 w-4 rounded-full mr-3 ${
                  testResults.auth ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-gray-700">Authentication</span>
              </div>
              <div className="flex items-center">
                <div className={`h-4 w-4 rounded-full mr-3 ${
                  testResults.components ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-gray-700">Components</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test; 