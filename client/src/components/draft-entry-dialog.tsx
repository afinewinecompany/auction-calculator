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
import { Checkbox } from '@/components/ui/checkbox';
import type { PlayerValue } from '@shared/schema';

interface DraftEntryDialogProps {
  player: PlayerValue;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (playerId: string, actualPrice: number, isMyBid: boolean) => void;
}

export function DraftEntryDialog({ player, isOpen, onClose, onConfirm }: DraftEntryDialogProps) {
  const [actualPrice, setActualPrice] = useState<string>('');
  const [isMyBid, setIsMyBid] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setIsMyBid(true);
      setActualPrice('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const price = parseInt(actualPrice);
    if (isNaN(price) || price < 1) {
      return;
    }

    onConfirm(player.id, price, isMyBid);
    setActualPrice('');
    setIsMyBid(true);
  };

  const canConfirm = actualPrice && parseInt(actualPrice) >= 1;

  const handleCancel = () => {
    setActualPrice('');
    setIsMyBid(true);
    onClose();
  };

  const projectedValue = player.adjustedValue || player.originalValue;
  const currentPrice = parseInt(actualPrice) || 0;
  const difference = currentPrice - projectedValue;
  const isOverpay = difference > 0;
  const isValue = difference < 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="glass-card-strong shadow-elevated rounded-2xl sm:max-w-md bg-card border-card-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-baseball-leather tracking-tight">
            RECORD DRAFT PICK
          </DialogTitle>
          <DialogDescription>
            Record the winning bid for this player
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-baseball-cream-dark p-4 rounded-md border border-card-border">
            <h3 className="font-bold text-lg mb-2">{player.name}</h3>
            <div className="flex gap-2 mb-3 flex-wrap">
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
                Winning Bid *
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

            <div className="flex items-center space-x-3 p-4 rounded-md bg-muted border border-border">
              <Checkbox
                id="my-bid"
                checked={isMyBid}
                onCheckedChange={(checked) => setIsMyBid(checked === true)}
                data-testid="checkbox-my-bid"
              />
              <Label htmlFor="my-bid" className="text-sm font-medium cursor-pointer flex-1">
                This is my winning bid
              </Label>
              {isMyBid && (
                <Badge variant="default" className="bg-baseball-green">My Team</Badge>
              )}
              {!isMyBid && (
                <Badge variant="secondary">Other Team</Badge>
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
            className="bg-baseball-navy button-modern shadow-float focus-glow"
            data-testid="button-confirm-draft"
          >
            Record Pick
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
