export interface CanonicalFieldDefinition {
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  transform?: (value: any, fullObject?: any) => any;
  defaultValue?: any;
}

export const CANONICAL_FIELDS: Record<string, CanonicalFieldDefinition> = {
  id: {
    type: 'string',
    required: true,
    transform: (value: any) => String(value),
  },
  city: {
    type: 'string',
    required: true,
    transform: (value: any) => String(value).trim(),
  },
  name: {
    type: 'string',
    required: false,
    transform: (value: any) => String(value).trim(),
  },
  country: {
    type: 'string',
    required: false,
    transform: (value: any) => String(value).trim(),
  },
  isAvailable: {
    type: 'boolean',
    required: true,
    transform: (value: any) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        return (
          lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1'
        );
      }
      if (typeof value === 'number') return value === 1;
      return false;
    },
  },
  pricePerNight: {
    type: 'number',
    required: true,
    transform: (value: any) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const num = parseFloat(value.replace(/[^0-9.-]+/g, ''));
        return isNaN(num) ? 0 : num;
      }
      return 0;
    },
  },

  priceSegment: {
    type: 'string',
    required: false,
    transform: (value: any) => {
      const validValues = ['low', 'medium', 'high'];
      const normalized = String(value || '').toLowerCase();

      if (validValues.includes(normalized)) return normalized;

      return 'medium';
    },
  },
};
