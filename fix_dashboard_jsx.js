const fs = require('fs');
const path = require('path');

const content = `import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [developer, setDeveloper] = useState(null);
  const [apps, setApps] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: devProfile, error: devError } = await supabase
        .from('app_developers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!devError && devProfile) {
        setDeveloper(devProfile);
        
        const { data: myApps, error: appsError } = await supabase
          .from('tabibi_apps')
          .select('*')
          .eq('developer_id', devProfile.id);
          
        if (!appsError) setApps(myApps || []);
      }
      
      setLoading(false);
    }
    fetchData();
  }, [navigate]);

  if (loading) return <div className='p-8'>Loading...</div>;

  return (
    <div className='min-h-screen bg-gray-50 p-8 font-sans' dir='ltr'>
      <header className='flex justify-between items-center mb-8'>
        <div>
           <h1 className='text-3xl font-bold text-gray-900'>Developer Dashboard</h1>
           {developer && <p className='text-gray-600 mt-1'>Welcome, {developer.name}</p>}
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate('/login');
          }}
          className='px-4 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50'
        >
          Logout
        </button>
      </header>
      
      {!developer ? (
        <div className='bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8'>
            <div className='flex'>
                <div className='ml-3'>
                    <p className='text-sm text-yellow-700'>
                        You are not registered as a developer yet. Please contact support to activate your developer account.
                    </p>
                </div>
            </div>
        </div>
      ) : (
        <>
            <main className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
                <div className='bg-white p-6 rounded-lg shadow'>
                <h3 className='text-lg font-medium text-gray-900'>My Apps</h3>
                <p className='mt-2 text-3xl font-bold text-green-600'>{apps.length}</p>
                </div>
                <div className='bg-white p-6 rounded-lg shadow'>
                <h3 className='text-lg font-medium text-gray-900'>Total Installs</h3>
                <p className='mt-2 text-3xl font-bold text-green-600'>0</p>
                </div>
                <div className='bg-white p-6 rounded-lg shadow'>
                <h3 className='text-lg font-medium text-gray-900'>Revenue</h3>
                <p className='mt-2 text-3xl font-bold text-green-600'>0 EGP</p>
                </div>
            </main>

            <section>
                <h2 className='text-2xl font-bold text-gray-900 mb-4'>My Applications</h2>
                {apps.length === 0 ? (
                    <p className='text-gray-500'>No apps found. Start by creating one!</p>
                ) : (
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                        {apps.map(app => (
                            <div key={app.id} className='bg-white rounded-lg shadow overflow-hidden'>
                                {app.image_url && (
                                    <img src={app.image_url} alt={app.title} className='w-full h-32 object-cover' />
                                )}
                                <div className='p-4'>
                                    <h3 className='font-bold text-lg mb-2'>{app.title}</h3>
                                    <p className='text-gray-600 text-sm mb-4 line-clamp-2'>{app.short_description}</p>
                                    <div className='flex justify-between items-center'>
                                        <span className={\`px-2 py-1 rounded text-xs \${app.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}\`}>
                                            {app.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        <span className='font-bold text-green-600'>
                                            {app.price > 0 ? \`\${app.price} EGP\` : 'Free'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </>
      )}
    </div>
  );
}`;

const filePath = 'c:/Users/hp/Desktop/Dev/tabibi-app_builder/src/pages/Dashboard.jsx';

try {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully wrote to ' + filePath);
} catch (err) {
  console.error('Error writing file:', err);
}
