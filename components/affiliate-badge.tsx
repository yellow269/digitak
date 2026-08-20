import { Badge } from '@/components/ui/badge';
import { Link2 } from 'lucide-react';

export function AffiliateBadge() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
        <Link2 className="mr-1 h-3 w-3" />
        Affiliate link
      </Badge>
      <Badge variant="outline" className="text-sky-700 border-sky-300 bg-sky-50">
        Sponsored / affiliate
      </Badge>
    </div>
  );
}
