/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach, test } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Must mock BEFORE importing component
vi.mock('@/lib/app-context', () => ({
  useAppContext: vi.fn(),
}));

// Import after mock is set up
import { ProjectionSourceToggle } from './projection-source-toggle';
import { useAppContext } from '@/lib/app-context';

const mockUseAppContext = vi.mocked(useAppContext);

describe('ProjectionSourceToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('should render without crashing', () => {
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: '2024-12-15T04:00:00.000Z',
      projectionSource: 'api',
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    const { container } = render(<ProjectionSourceToggle />);
    expect(container).toBeTruthy();
  });

  test('should show "Using API projections" when source is api', () => {
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: '2024-12-15T04:00:00.000Z',
      projectionSource: 'api',
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    render(<ProjectionSourceToggle />);
    expect(screen.getByText(/Using API projections/i)).toBeTruthy();
  });

  test('should show "Using uploaded projections" when source is csv', () => {
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: null,
      projectionSource: 'csv',
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    render(<ProjectionSourceToggle />);
    expect(screen.getByText(/Using uploaded projections/i)).toBeTruthy();
  });

  test('should show "No projections loaded" when source is null', () => {
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: null,
      projectionSource: null,
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    render(<ProjectionSourceToggle />);
    expect(screen.getByText(/No projections loaded/i)).toBeTruthy();
  });

  test('should show timestamp when API source and lastUpdated exists', () => {
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: '2024-12-15T09:00:00.000Z',
      projectionSource: 'api',
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    render(<ProjectionSourceToggle />);
    expect(screen.getByText(/Dec 15, 2024/i)).toBeTruthy();
  });

  test('should display Cloud icon for API source', () => {
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: '2024-12-15T04:00:00.000Z',
      projectionSource: 'api',
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    const { container } = render(<ProjectionSourceToggle />);
    const cloudIcon = container.querySelector('[data-testid="cloud-icon"]');
    expect(cloudIcon).toBeTruthy();
  });

  test('should display FileText icon for CSV source', () => {
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: null,
      projectionSource: 'csv',
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    const { container } = render(<ProjectionSourceToggle />);
    const fileIcon = container.querySelector('[data-testid="file-text-icon"]');
    expect(fileIcon).toBeTruthy();
  });

  test('should have muted background styling', () => {
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: '2024-12-15T04:00:00.000Z',
      projectionSource: 'api',
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    const { container } = render(<ProjectionSourceToggle />);
    const mutedElement = container.querySelector('.bg-muted');
    expect(mutedElement).toBeTruthy();
  });

  test('should use small text size', () => {
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: '2024-12-15T04:00:00.000Z',
      projectionSource: 'api',
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    const { container } = render(<ProjectionSourceToggle />);
    const smallTextElement = container.querySelector('.text-sm');
    expect(smallTextElement).toBeTruthy();
  });

  // Task 2: Switch to CSV mode tests (AC2)
  test('should show "Upload Custom" button when API is active source', () => {
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: '2024-12-15T04:00:00.000Z',
      projectionSource: 'api',
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    render(<ProjectionSourceToggle />);
    const uploadButton = screen.getByTestId('button-switch-to-csv');
    expect(uploadButton).toBeTruthy();
    expect(uploadButton.textContent).toContain('Upload Custom');
  });

  test('should not show "Upload Custom" button when CSV is active', () => {
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: null,
      projectionSource: 'csv',
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    render(<ProjectionSourceToggle />);
    const uploadButton = screen.queryByTestId('button-switch-to-csv');
    expect(uploadButton).toBeNull();
  });

  test('should call onSwitchToCsv callback when "Upload Custom" is clicked', async () => {
    const onSwitchToCsv = vi.fn();
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: '2024-12-15T04:00:00.000Z',
      projectionSource: 'api',
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    render(<ProjectionSourceToggle onSwitchToCsv={onSwitchToCsv} />);
    const uploadButton = screen.getByTestId('button-switch-to-csv');
    uploadButton.click();
    expect(onSwitchToCsv).toHaveBeenCalledTimes(1);
  });

  // Task 3: Switch back to API tests (AC3)
  test('should show "Use API" button when CSV is active source', () => {
    const mockRefetch = vi.fn();
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: null,
      projectionSource: 'csv',
      refetchProjections: mockRefetch,
    } as unknown as ReturnType<typeof useAppContext>);

    render(<ProjectionSourceToggle />);
    const apiButton = screen.getByTestId('button-switch-to-api');
    expect(apiButton).toBeTruthy();
    expect(apiButton.textContent).toContain('Use API');
  });

  test('should not show "Use API" button when API is active', () => {
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: '2024-12-15T04:00:00.000Z',
      projectionSource: 'api',
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    render(<ProjectionSourceToggle />);
    const apiButton = screen.queryByTestId('button-switch-to-api');
    expect(apiButton).toBeNull();
  });

  test('should call refetchProjections when "Use API" is clicked', () => {
    const mockRefetch = vi.fn();
    mockUseAppContext.mockReturnValue({
      projectionsLoading: false,
      projectionsError: null,
      projectionsLastUpdated: null,
      projectionSource: 'csv',
      refetchProjections: mockRefetch,
    } as unknown as ReturnType<typeof useAppContext>);

    render(<ProjectionSourceToggle />);
    const apiButton = screen.getByTestId('button-switch-to-api');
    apiButton.click();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  test('should show loading state during API refetch', () => {
    mockUseAppContext.mockReturnValue({
      projectionsLoading: true,
      projectionsError: null,
      projectionsLastUpdated: null,
      projectionSource: 'csv',
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    const { container } = render(<ProjectionSourceToggle />);
    const loader = container.querySelector('[data-testid="loader-icon"]');
    expect(loader).toBeTruthy();
  });

  test('should disable "Use API" button during loading', () => {
    mockUseAppContext.mockReturnValue({
      projectionsLoading: true,
      projectionsError: null,
      projectionsLastUpdated: null,
      projectionSource: 'csv',
      refetchProjections: vi.fn(),
    } as unknown as ReturnType<typeof useAppContext>);

    render(<ProjectionSourceToggle />);
    const apiButton = screen.getByTestId('button-switch-to-api');
    expect(apiButton.getAttribute('disabled')).toBe('');
  });
});
