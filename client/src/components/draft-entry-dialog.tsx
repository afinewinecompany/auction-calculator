import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/lib/app-context';
import type { PlayerValue } from '@shared/schema';

interface DraftEntryDialogProps {
  player: PlayerValue;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (playerId: string, actualPrice: number, draftedBy?: string) => void;
}

export function DraftEntryDialog({ player, isOpen, onClose, onConfirm }: DraftEntryDialogProps) {
  const { myTeamName } = useAppContext();
  const [actualPrice, setActualPrice] = useState<string>('');
  const [draftedBy, setDraftedBy] = useState<string>('');
  const [isMyPick, setIsMyPick] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setIsMyPick(true);
      setDraftedBy(myTeamName);
    }
  }, [isOpen, myTeamName]);

  const handleConfirm = () => {
    const price = parseInt(actualPrice);
    if (isNaN(price) || price < 1) {
      return;
    }

    if (!isMyPick && !draftedBy.trim()) {
      return;
    }

    const teamName = isMyPick ? myTeamName : draftedBy.trim();
    onConfirm(player.id, price, teamName);
    setActualPrice('');
    setDraftedBy('');
    setIsMyPick(true);
  };

  const canConfirm = actualPrice && parseInt(actualPrice) >= 1 && (isMyPick || draftedBy.trim());

  const handleCancel = () => {
    setActualPrice('');
    setDraftedBy('');
    setIsMyPick(true);
    onClose();
  };

  const handleTeamToggle = (isMe: boolean) => {
    setIsMyPick(isMe);
    if (isMe) {
      setDraftedBy(myTeamName);
    } else {
      setDraftedBy('');
    }
  };

  const projectedValue = player.adjustedValue || player.originalValue;
  const currentPrice = parseInt(actualPrice) || 0;
  const difference = currentPrice - projectedValue;
  const isOverpay = difference > 0;
  const isValue = difference < 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md bg-card border-card-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-baseball-leather tracking-tight">
            DRAFT PLAYER
          </DialogTitle>
          <DialogDescription>
            Record this player's actual draft price
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-baseball-cream-dark p-4 rounded-md border border-card-border">
            <h3 className="font-bold text-lg mb-2">{player.name}</h3>
            <div className="flex gap-2 mb-3">
              {player.positions.map(pos => (
                <Badge key={pos} variant="secondary">{pos}</Badge>
              ))}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-muted-foreground">Your projected value:</span>
              <span className="font-mono font-bold text-baseball-navy text-xl">
                ${projectedValue}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="actual-price" className="text-sm font-medium">
                Actual Draft Price *
              </Label>
              <Input
                id="actual-price"
                type="number"
                min="1"
                placeholder="Enter price"
                value={actualPrice}
                onChange={(e) => setActualPrice(e.target.value)}
                className="font-mono text-lg"
                data-testid="input-draft-price"
                autoFocus
              />
              {actualPrice && currentPrice > 0 && (
                <div className={`text-sm font-medium ${
                  isOverpay ? 'text-destructive' : isValue ? 'text-baseball-green' : 'text-muted-foreground'
                }`}>
                  {isOverpay && `+$${difference} overpay`}
                  {isValue && `-$${Math.abs(difference)} VALUE!`}
                  {!isOverpay && !isValue && 'Exactly as projected'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Drafted By</Label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant={isMyPick ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTeamToggle(true)}
                  className={isMyPick ? "bg-baseball-navy flex-1" : "flex-1"}
                  data-testid="button-my-pick"
                >
                  {myTeamName}
                </Button>
                <Button
                  type="button"
                  variant={!isMyPick ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTeamToggle(false)}
                  className={!isMyPick ? "bg-muted flex-1" : "flex-1"}
                  data-testid="button-other-team"
                >
                  Other Team
                </Button>
              </div>
              {!isMyPick && (
                <Input
                  id="drafted-by"
                  type="text"
                  placeholder="Enter team name"
                  value={draftedBy}
                  onChange={(e) => setDraftedBy(e.target.value)}
                  data-testid="input-drafted-by"
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            data-testid="button-cancel-draft"
            className="hover-elevate"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="bg-baseball-navy hover-elevate active-elevate-2"
            data-testid="button-confirm-draft"
          >
            Confirm Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
