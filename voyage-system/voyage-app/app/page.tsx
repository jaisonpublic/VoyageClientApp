'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Home() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [step, setStep] = useState<'loading' | 'form' | 'chat'>('loading');
  
  // Form State
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [dates, setDates] = useState('');
  const [pax, setPax] = useState(1);
  
  // Chat State
  const [tripPlanId, setTripPlanId] = useState<number | null>(null);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [status, setStatus] = useState('');

  const BACKEND_URL = 'http://localhost:8001';

  useEffect(() => {
    const init = async () => {
      const dataParam = searchParams.get('data');
      if (!dataParam) {
        // For dev/demo, if no param, maybe show a "Launch from Bank App" message
        // But for testing, we might want a way to bypass or mock.
        // Let's just show error for now.
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${BACKEND_URL}/auth/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: dataParam }),
        });
        
        if (!res.ok) throw new Error('Auth failed');
        
        const data = await res.json();
        setToken(data.access_token);
        setProfile(data.profile);
        setStep('form');
      } catch (err) {
        console.error(err);
        alert('Authentication failed. Please launch from the Bank App.');
      } finally {
        setLoading(false);
      }
    };
    
    init();
  }, [searchParams]);

  const startChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          origin,
          destination,
          travel_date: dates,
          pax
        }),
      });
      
      const data = await res.json();
      setTripPlanId(data.tripplanid);
      setMessages(prev => [...prev, { role: 'user', content: `Plan a trip from ${origin} to ${destination} on ${dates} for ${pax} people.` }]);
      setStep('chat');
      pollChat(data.tripplanid);
    } catch (err) {
      console.error(err);
    }
  };

  const pollChat = (id: number) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/chat/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setStatus(data.status);
        
        // In a real chat, we'd append new messages. Here we just update the last response.
        // We'll just show the latest response from server as a "bot" message.
        // To avoid duplicates, we could check if content changed.
        setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last.role === 'assistant' && last.content === data.response) return prev;
            if (last.role === 'assistant') {
                // Update last message
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1] = { role: 'assistant', content: data.response };
                return newMsgs;
            }
            return [...prev, { role: 'assistant', content: data.response }];
        });

        if (data.status === 'completed') clearInterval(interval);
      } catch (err) {
        clearInterval(interval);
      }
    }, 1000);
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading Voyage...</div>;
  
  if (!token) return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <div className="p-8 bg-gray-800 rounded-lg shadow-xl text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>Please launch this app from the Voyage Bank App.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <header className="p-4 bg-gray-800 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Voyage</h1>
        <div className="text-sm text-gray-400">
            Welcome, {profile?.nickname} ({profile?.language})
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto">
        {step === 'form' && (
          <form onSubmit={startChat} className="space-y-4 bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Plan Your Trip</h2>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Origin</label>
              <input 
                type="text" 
                value={origin} 
                onChange={e => setOrigin(e.target.value)} 
                className="w-full bg-gray-700 border border-gray-600 rounded p-2 focus:outline-none focus:border-blue-500"
                placeholder="New York"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Destination</label>
              <input 
                type="text" 
                value={destination} 
                onChange={e => setDestination(e.target.value)} 
                className="w-full bg-gray-700 border border-gray-600 rounded p-2 focus:outline-none focus:border-blue-500"
                placeholder="Paris"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Travel Dates</label>
              <input 
                type="text" 
                value={dates} 
                onChange={e => setDates(e.target.value)} 
                className="w-full bg-gray-700 border border-gray-600 rounded p-2 focus:outline-none focus:border-blue-500"
                placeholder="Oct 10 - Oct 20"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Passengers</label>
              <input 
                type="number" 
                value={pax} 
                onChange={e => setPax(parseInt(e.target.value))} 
                className="w-full bg-gray-700 border border-gray-600 rounded p-2 focus:outline-none focus:border-blue-500"
                min="1"
                required
              />
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-2 px-4 rounded transition-all">
              Start Planning
            </button>
          </form>
        )}

        {step === 'chat' && (
          <div className="flex flex-col h-[80vh] bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {status === 'processing' && (
                 <div className="text-xs text-gray-500 text-center animate-pulse">Voyage AI is thinking...</div>
              )}
            </div>
            <div className="p-4 bg-gray-900 border-t border-gray-700">
                {/* Input for multi-turn chat would go here */}
                <input disabled placeholder="Reply..." className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-500 cursor-not-allowed" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
