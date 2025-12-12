import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppContext } from '@/lib/app-context';
import { leagueSettingsSchema, POSITION_OPTIONS, type LeagueSettings } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';

interface LeagueConfigFormProps {
  onComplete: () => void;
  isComplete: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function LeagueConfigForm({ onComplete, isComplete, isCollapsed = false, onToggle }: LeagueConfigFormProps) {
  const { leagueSettings, setLeagueSettings } = useAppContext();

  const form = useForm<LeagueSettings>({
    resolver: zodResolver(leagueSettingsSchema),
    defaultValues: leagueSettings || {
      leagueName: '',
      teamCount: 12,
      auctionBudget: 260,
      totalRosterSpots: 23,
      positionRequirements: {
        C: 1,
        '1B': 1,
        '2B': 1,
        '3B': 1,
        SS: 1,
        OF: 3,
        UTIL: 1,
        MI: 0,
        CI: 0,
        SP: 5,
        RP: 2,
        P: 0,
        BENCH: 3,
      },
    },
  });

  const positionRequirements = form.watch('positionRequirements');
  const totalConfigured = Object.values(positionRequirements).reduce((sum, val) => sum + val, 0);
  const totalRosterSpots = form.watch('totalRosterSpots');

  const onSubmit = (data: LeagueSettings) => {
    setLeagueSettings(data);
    onComplete();
  };

  const getSummary = () => {
    if (!leagueSettings) return null;
    return `${leagueSettings.teamCount} teams, $${leagueSettings.auctionBudget} budget, ${leagueSettings.totalRosterSpots} roster spots`;
  };

  return (
    <Collapsible open={!isCollapsed} onOpenChange={() => onToggle?.()}>
      <Card className="glass-card-strong rounded-xl p-8 shadow-float hover-lift border-card-border">
        <CollapsibleTrigger asChild>
          <CardHeader className="bg-baseball-leather text-baseball-cream pb-6 cursor-pointer hover-elevate">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {isComplete && <Check className="h-7 w-7 text-baseball-green" />}
                <div>
                  <CardTitle className="font-display text-3xl tracking-tight">
                    LEAGUE CONFIGURATION
                  </CardTitle>
                  {isCollapsed && isComplete && (
                    <p className="text-baseball-cream/80 text-sm mt-1 font-mono">{getSummary()}</p>
                  )}
                  {!isCollapsed && (
                    <CardDescription className="text-baseball-cream/80 text-base mt-1">
                      Set up your league's basic settings and roster requirements
                    </CardDescription>
                  )}
                </div>
              </div>
              {isCollapsed ? (
                <ChevronRight className="h-6 w-6 text-baseball-cream/80" />
              ) : (
                <ChevronDown className="h-6 w-6 text-baseball-cream/80" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-8 pb-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="leagueName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">League Name (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="My Fantasy League"
                            {...field}
                            data-testid="input-league-name"
                            className="bg-background border-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="teamCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">Number of Teams</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="2"
                            max="30"
                            placeholder="12"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 12)}
                            data-testid="input-team-count"
                            className="font-mono bg-background border-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auctionBudget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">Auction Budget per Team</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="260"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-auction-budget"
                            className="font-mono bg-background border-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalRosterSpots"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">Total Roster Spots</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="23"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-total-roster"
                            className="font-mono bg-background border-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <h3 className="font-display text-xl text-baseball-navy tracking-tight mb-4">POSITION REQUIREMENTS</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {POSITION_OPTIONS.map((position) => (
                      <FormField
                        key={position}
                        control={form.control}
                        name={`positionRequirements.${position}` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {position}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                data-testid={`input-position-${position.toLowerCase()}`}
                                className="font-mono text-center bg-background border-input"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-muted rounded-md border border-border">
                    <p className="text-sm font-mono">
                      Total roster spots configured:{' '}
                      <span className={`font-bold ${totalConfigured === totalRosterSpots ? 'text-baseball-green' : 'text-warning'}`}>
                        {totalConfigured}
                      </span>{' '}
                      / {totalRosterSpots}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-baseball-navy button-modern shadow-float focus-glow"
                    data-testid="button-save-league-config"
                  >
                    {isComplete ? 'Update Configuration' : 'Save & Continue'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
