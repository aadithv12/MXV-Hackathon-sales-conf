import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { supabase } from '../services/supabase';
import { Registration, RegistrationFormData, TShirtSize, DietaryPreference } from '../types';
import { BRANCH_REGIONS, TSHIRT_SIZES, DIETARY_PREFERENCES } from '../constants';
import { LoadingSpinner } from './icons';

const initialFormData: RegistrationFormData = {
  name: '',
  email: '',
  phone: '',
  branch_region: BRANCH_REGIONS[0],
  tshirt_size: TShirtSize.M,
  dietary_preference: DietaryPreference.NON_VEGETARIAN,
};

const RegistrationForm: React.FC = () => {
  const [formData, setFormData] = useState<RegistrationFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof RegistrationFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { setUser } = useUser();

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof RegistrationFormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9\s-()]{10,}$/.test(formData.phone)) {
        newErrors.phone = 'Phone number is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof RegistrationFormData]) {
      setErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      // 1. Check if email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('registrations')
        .select('*') // Fetch full user data
        .eq('email', formData.email)
        .single();

      // If a user is found, log them in by setting user context
      if (existingUser) {
        setUser(existingUser as Registration);
        setIsLoading(false);
        return;
      }
      
      // If no user is found (PGRST116), proceed to registration. 
      // Throw any other database errors.
      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(checkError.message);
      }

      // 2. Insert new registration if email doesn't exist
      // FIX: Generate timestamp on the client to save as IST.
      // This assumes the user's browser time is set to IST.
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const registered_at_ist = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      const registrationPayload = {
        ...formData,
        registered_at: registered_at_ist,
      };

      const { data, error: insertError } = await supabase
        .from('registrations')
        .insert([registrationPayload])
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      if (data) {
        setUser(data as Registration);
      }
    } catch (error) {
      const err = error as Error;
      // Updated error message to be more generic
      setApiError(`Operation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (id: keyof RegistrationFormData, label: string, type: string = 'text') => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        id={id}
        name={id}
        value={formData[id]}
        onChange={handleChange}
        className={`w-full px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors[id] ? 'border-red-500' : 'border-gray-300'}`}
        disabled={isLoading}
      />
      {errors[id] && <p className="text-red-600 text-sm mt-1">{errors[id]}</p>}
    </div>
  );

  const renderSelect = (id: keyof RegistrationFormData, label: string, options: readonly string[]) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        id={id}
        name={id}
        value={formData[id]}
        onChange={handleChange}
        className={`w-full px-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors[id] ? 'border-red-500' : 'border-gray-300'}`}
        disabled={isLoading}
      >
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      {errors[id] && <p className="text-red-600 text-sm mt-1">{errors[id]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="p-8 space-y-6">
      {apiError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4" role="alert">{apiError}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderInput('name', 'Full Name')}
        {renderInput('email', 'Email Address', 'email')}
        {renderInput('phone', 'Phone Number', 'tel')}
        {renderSelect('branch_region', 'Branch / Region', BRANCH_REGIONS)}
        {renderSelect('tshirt_size', 'T-Shirt Size', TSHIRT_SIZES)}
        {renderSelect('dietary_preference', 'Dietary Preference', DIETARY_PREFERENCES)}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300"
      >
        {isLoading ? <LoadingSpinner /> : 'Register or Login'}
      </button>
    </form>
  );
};

export default RegistrationForm;