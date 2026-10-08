import { useState } from 'react';
import { User } from 'lucide-react';
import { Input } from '@/components/motion/input';
import { Button } from '@/components/motion/button/base';
import {
  Combobox,
  ComboboxTrigger,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/motion/combobox';
import { SRI_LANKAN_CITIES } from '@/utils/sri-lankan-cities';
import { formatSLPhone } from '@/utils/sanitize';

/**
 * Strip digits from name fields so users can't type numbers.
 */
const stripNumbers = (val) => val.replace(/[0-9]/g, '');

export const PersonalInfoStep = ({ formData, handleChange, handleBlur, errors, handleNextStep }) => {
  const [cityQuery, setCityQuery] = useState('');

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground flex items-center gap-2">
        <User className="w-4 h-4 text-primary shrink-0" />
        <span>Your personal details are used for official school records and ID generation.</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={<>Index Number <span className="text-destructive">*</span></>}
          type="text"
          inputMode="numeric"
          value={formData.index_number}
          onChange={(val) => handleChange('index_number', val.replace(/\D/g, ''))}
          onBlur={() => handleBlur('index_number')}
          placeholder="e.g. 29012"
          error={errors.index_number}
        />

        <Input
          label={<>Date of Birth <span className="text-destructive">*</span></>}
          type="date"
          value={formData.date_of_birth}
          onChange={(val) => handleChange('date_of_birth', val)}
          onBlur={() => handleBlur('date_of_birth')}
          error={errors.date_of_birth}
        />
      </div>

      <Input
        label={<>Full Name <span className="text-destructive">*</span></>}
        type="text"
        value={formData.full_name}
        onChange={(val) => handleChange('full_name', stripNumbers(val))}
        onBlur={() => handleBlur('full_name')}
        placeholder="e.g. Sunil Perera"
        error={errors.full_name}
      />

      <Input
        label={<>Name with Initials <span className="text-destructive">*</span></>}
        type="text"
        value={formData.name_with_initials}
        onChange={(val) => handleChange('name_with_initials', stripNumbers(val))}
        onBlur={() => handleBlur('name_with_initials')}
        placeholder="e.g. S. Perera"
        error={errors.name_with_initials}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            WhatsApp Number <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-muted-foreground bg-muted/50 border border-border/50 rounded-xl px-3 py-2.5 font-mono">
              🇱🇰 +94
            </span>
            <Input
              type="tel"
              inputMode="numeric"
              value={formData.whatsapp_number}
              onChange={(val) => handleChange('whatsapp_number', formatSLPhone(val))}
              onBlur={() => handleBlur('whatsapp_number')}
              placeholder="7X XXX XXXX"
              error={errors.whatsapp_number}
            />
          </div>
          {errors.whatsapp_number && (
            <p className="text-xs text-destructive mt-1">{errors.whatsapp_number}</p>
          )}
        </div>

        <Input
          label={<>Email Address <span className="text-destructive">*</span></>}
          type="email"
          value={formData.email_address}
          onChange={(val) => handleChange('email_address', val)}
          onBlur={() => handleBlur('email_address')}
          placeholder="e.g. sunil@example.com"
          error={errors.email_address}
        />
      </div>

      {/* City — Searchable Combobox with Sri Lankan cities + custom typing */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          City <span className="text-muted-foreground font-normal">(Optional)</span>
        </label>
        <Combobox
          value={formData.city}
          onValueChange={(val) => handleChange('city', val)}
          query={cityQuery}
          onQueryChange={setCityQuery}
        >
          <ComboboxTrigger className="w-full">
            <ComboboxInput placeholder="Search or type your city..." />
          </ComboboxTrigger>
          <ComboboxContent>
            <ComboboxList>
              <ComboboxEmpty>
                {cityQuery.trim() ? (
                  <button
                    type="button"
                    className="w-full text-left px-2 py-1.5 text-sm text-primary hover:bg-muted/50 rounded-lg transition-colors"
                    onClick={() => {
                      handleChange('city', cityQuery.trim());
                      setCityQuery('');
                    }}
                  >
                    Use "<span className="font-semibold">{cityQuery.trim()}</span>"
                  </button>
                ) : (
                  'Type a city name'
                )}
              </ComboboxEmpty>
              {SRI_LANKAN_CITIES.map((city) => (
                <ComboboxItem key={city} value={city}>
                  {city}
                </ComboboxItem>
              ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {errors.city && (
          <p className="text-xs text-destructive mt-1">{errors.city}</p>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t border-border/50">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleNextStep}
        >
          Continue to Guardian &rarr;
        </Button>
      </div>
    </div>
  );
};


