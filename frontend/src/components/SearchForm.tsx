import React, { useState, useEffect } from 'react';
import { FiSearch, FiChevronDown } from 'react-icons/fi';
import useSearch from '../hooks/useSearch';

interface SearchFormProps {
  onSearch: (data: any) => void;
  loading?: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch, loading = false }) => {
  const { countries, categories, fetchCountries, fetchCategories } = useSearch();
  const [keyword, setKeyword] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [expandedFilters, setExpandedFilters] = useState(false);

  useEffect(() => {
    fetchCountries();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (countries.length > 0 && selectedCountries.length === 0) {
      setSelectedCountries(countries.map(c => c.code));
    }
  }, [countries]);

  const handleCountryChange = (code: string) => {
    setSelectedCountries(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const handleCategoryChange = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id)
        ? prev.filter(c => c !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keyword.trim()) {
      alert('Inserisci una keyword');
      return;
    }

    onSearch({
      keyword,
      countries: selectedCountries.length > 0 ? selectedCountries : countries.map(c => c.code),
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      priceMin: priceMin ? parseFloat(priceMin) : undefined,
      priceMax: priceMax ? parseFloat(priceMax) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Cerca prodotto su Vinted..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vinted-primary"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-vinted-primary text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition flex items-center gap-2"
        >
          <FiSearch /> {loading ? 'Ricerca...' : 'Cerca'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setExpandedFilters(!expandedFilters)}
        className="flex items-center gap-2 text-vinted-primary hover:underline"
      >
        <FiChevronDown className={`transition ${expandedFilters ? 'rotate-180' : ''}`} />
        Filtri avanzati
      </button>

      {expandedFilters && (
        <div className="space-y-4 pt-4 border-t">
          {/* Countries */}
          <div>
            <h4 className="font-semibold mb-2">Paesi</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {countries.map(country => (
                <label key={country.code} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCountries.includes(country.code)}
                    onChange={() => handleCountryChange(country.code)}
                    className="rounded"
                  />
                  <span className="text-sm">{country.code}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-2">Categorie</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categories.map(category => (
                <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleCategoryChange(category.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{category.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Prezzo minimo</label>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="€"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Prezzo massimo</label>
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="€"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default SearchForm;
