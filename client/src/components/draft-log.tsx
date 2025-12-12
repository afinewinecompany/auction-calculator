import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Check, Pencil, X, Trash2, User } from 'lucide-react';
import type { DraftPick } from '@shared/schema';

interface DraftLogProps {
  picks: DraftPick[];
  onUndo?: () => void;
  onUpdatePick?: (pickId: string, newPrice: number, isMyBid: boolean) => void;
  onDeletePick?: (pickId: string) => void;
}

export function DraftLog({ picks, onUpdatePick, onDeletePick }: DraftLogProps) {
  const [editingPickId, setEditingPickId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editIsMyBid, setEditIsMyBid] = useState<boolean>(false);

  const sortedPicks = [...picks].sort((a, b) => b.pickNumber - a.pickNumber);
  
  const myPicks = picks.filter(p => p.isMyBid);
  const otherPicks = picks.filter(p => !p.isMyBid);
  const myTotalSpent = myPicks.reduce((sum, p) => sum + p.actualPrice, 0);

  const handleStartEdit = (pick: DraftPick) => {
    setEditingPickId(pick.id);
    setEditPrice(pick.actualPrice.toString());
    setEditIsMyBid(pick.isMyBid ?? false);
  };

  const handleSaveEdit = () => {
    if (!editingPickId || !onUpdatePick) return;
    const price = parseInt(editPrice);
    if (isNaN(price) || price < 1) return;
    
    onUpdatePick(editingPickId, price, editIsMyBid);
    setEditingPickId(null);
    setEditPrice('');
  };

  const handleCancelEdit = () => {
    setEditingPickId(null);
    setEditPrice('');
  };

  return (
    <Card className="glass-card-strong rounded-xl p-8 shadow-float hover-lift border-card-border h-fit sticky top-24">
      <CardHeader className="bg-baseball-leather text-baseball-cream pb-4">
        <CardTitle className="font-display text-2xl tracking-tight">
          DRAFT LOG
        </CardTitle>
        <CardDescription className="text-baseball-cream/80">
          <span className="block">{picks.length} total picks recorded</span>
          <span className="flex items-center gap-4 mt-1">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              My team: {myPicks.length} (${myTotalSpent})
            </span>
            <span>Others: {otherPicks.length}</span>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
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
                const isEditing = editingPickId === pick.id;

                return (
                  <div
                    key={pick.id}
                    className={`p-4 ${pick.isMyBid ? 'bg-baseball-green/5' : ''}`}
                    data-testid={`draft-pick-${pick.id}`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold">{pick.playerName}</h4>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleSaveEdit}
                              data-testid={`button-save-edit-${pick.id}`}
                            >
                              <Check className="h-4 w-4 text-baseball-green" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              data-testid={`button-cancel-edit-${pick.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Input
                            type="number"
                            min="1"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="font-mono"
                            data-testid={`input-edit-price-${pick.id}`}
                            autoFocus
                          />
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-my-bid-${pick.id}`}
                              checked={editIsMyBid}
                              onCheckedChange={(checked) => setEditIsMyBid(checked === true)}
                              data-testid={`checkbox-edit-my-bid-${pick.id}`}
                            />
                            <label htmlFor={`edit-my-bid-${pick.id}`} className="text-sm cursor-pointer">
                              My winning bid
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-mono font-semibold text-muted-foreground">
                                #{pick.pickNumber}
                              </span>
                              <h4 className="font-semibold truncate">{pick.playerName}</h4>
                              {pick.isMyBid && (
                                <Badge variant="default" className="bg-baseball-green text-xs">
                                  My Team
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1 flex-wrap mb-2">
                              {pick.positions.map(pos => (
                                <Badge key={pos} variant="secondary" className="text-xs">
                                  {pos}
                                </Badge>
                              ))}
                            </div>
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

                        <div className="flex items-center justify-between gap-2">
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
                          
                          <div className="flex gap-1">
                            {onUpdatePick && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleStartEdit(pick)}
                                className="h-7 w-7"
                                data-testid={`button-edit-pick-${pick.id}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                            {onDeletePick && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onDeletePick(pick.id)}
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                data-testid={`button-delete-pick-${pick.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
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
