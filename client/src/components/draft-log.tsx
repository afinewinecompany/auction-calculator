import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Check } from 'lucide-react';
import type { DraftPick } from '@shared/schema';

interface DraftLogProps {
  picks: DraftPick[];
  onUndo?: () => void;
}

export function DraftLog({ picks }: DraftLogProps) {
  const sortedPicks = [...picks].sort((a, b) => b.pickNumber - a.pickNumber);

  return (
    <Card className="border-card-border shadow-md h-fit sticky top-24">
      <CardHeader className="bg-baseball-leather text-baseball-cream pb-4">
        <CardTitle className="font-display text-2xl tracking-tight">
          DRAFT LOG
        </CardTitle>
        <CardDescription className="text-baseball-cream/80">
          {picks.length} {picks.length === 1 ? 'pick' : 'picks'} recorded
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          {sortedPicks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">No picks yet</p>
              <p className="text-xs mt-1">Start drafting to see picks here</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedPicks.map((pick) => {
                const difference = pick.actualPrice - pick.projectedValue;
                const isOverpay = difference > 0;
                const isValue = difference < -2;
                const isEven = Math.abs(difference) <= 2;

                return (
                  <div
                    key={pick.id}
                    className="p-4 hover-elevate"
                    data-testid={`draft-pick-${pick.id}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-semibold text-muted-foreground">
                            #{pick.pickNumber}
                          </span>
                          <h4 className="font-semibold truncate">{pick.playerName}</h4>
                        </div>
                        <div className="flex gap-1 flex-wrap mb-2">
                          {pick.positions.map(pos => (
                            <Badge key={pos} variant="secondary" className="text-xs">
                              {pos}
                            </Badge>
                          ))}
                        </div>
                        {pick.draftedBy && (
                          <p className="text-xs text-muted-foreground">
                            Drafted by: {pick.draftedBy}
                          </p>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-mono font-bold text-baseball-navy text-lg">
                          ${pick.actualPrice}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          (proj: ${pick.projectedValue})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isValue && (
                        <div className="flex items-center gap-1 text-xs font-medium text-baseball-green">
                          <TrendingDown className="h-3 w-3" />
                          <span>-${Math.abs(difference)} VALUE!</span>
                        </div>
                      )}
                      {isOverpay && (
                        <div className="flex items-center gap-1 text-xs font-medium text-destructive">
                          <TrendingUp className="h-3 w-3" />
                          <span>+${difference} overpay</span>
                        </div>
                      )}
                      {isEven && (
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Check className="h-3 w-3" />
                          <span>Fair value</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
