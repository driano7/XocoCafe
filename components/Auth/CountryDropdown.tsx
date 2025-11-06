'use client';

import { useState, useRef, useEffect } from 'react';

interface CountryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  inputId?: string;
}

const countries = [
  'México',
  'Estados Unidos',
  'Canadá',
  'España',
  'Argentina',
  'Colombia',
  'Chile',
  'Perú',
  'Venezuela',
  'Ecuador',
  'Bolivia',
  'Paraguay',
  'Uruguay',
  'Brasil',
  'Guatemala',
  'Honduras',
  'El Salvador',
  'Nicaragua',
  'Costa Rica',
  'Panamá',
  'Cuba',
  'República Dominicana',
  'Haití',
  'Jamaica',
  'Puerto Rico',
  'Francia',
  'Alemania',
  'Italia',
  'Reino Unido',
  'Portugal',
  'Países Bajos',
  'Bélgica',
  'Suiza',
  'Austria',
  'Suecia',
  'Noruega',
  'Dinamarca',
  'Finlandia',
  'Polonia',
  'República Checa',
  'Hungría',
  'Rumania',
  'Bulgaria',
  'Grecia',
  'Turquía',
  'Rusia',
  'Ucrania',
  'China',
  'Japón',
  'Corea del Sur',
  'India',
  'Tailandia',
  'Vietnam',
  'Filipinas',
  'Indonesia',
  'Malasia',
  'Singapur',
  'Australia',
  'Nueva Zelanda',
  'Sudáfrica',
  'Egipto',
  'Marruecos',
  'Nigeria',
  'Kenia',
  'Ghana',
  'Etiopía',
  'Israel',
  'Arabia Saudita',
  'Emiratos Árabes Unidos',
  'Irán',
  'Irak',
  'Afganistán',
  'Pakistán',
  'Bangladesh',
  'Sri Lanka',
  'Nepal',
  'Bután',
];

export default function CountryDropdown({ value, onChange, error, inputId }: CountryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCountries, setFilteredCountries] = useState(countries);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const filtered = countries.filter((country) =>
      country.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCountries(filtered);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (country: string) => {
    onChange(country);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);

    // Si el usuario borra todo, limpiar la selección
    if (newValue === '') {
      onChange('');
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        value={isOpen ? searchTerm : value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder="Buscar país..."
        className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
          error ? 'border-red-500' : ''
        }`}
      />

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredCountries.length > 0 ? (
            filteredCountries.map((country) => (
              <button
                key={country}
                type="button"
                onClick={() => handleSelect(country)}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
              >
                {country}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
              No se encontraron países
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
