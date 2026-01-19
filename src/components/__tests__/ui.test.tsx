import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

describe('Button Component', () => {
    it('renders with default variant', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole('button')).toHaveTextContent('Click me');
    });

    it('renders with different variants', () => {
        const { rerender } = render(<Button variant="default">Default</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'default');

        rerender(<Button variant="destructive">Destructive</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'destructive');

        rerender(<Button variant="outline">Outline</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'outline');

        rerender(<Button variant="secondary">Secondary</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'secondary');

        rerender(<Button variant="ghost">Ghost</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'ghost');

        rerender(<Button variant="link">Link</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'link');
    });

    it('renders with different sizes', () => {
        const { rerender } = render(<Button size="default">Default</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('data-size', 'default');

        rerender(<Button size="sm">Small</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('data-size', 'sm');

        rerender(<Button size="lg">Large</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('data-size', 'lg');

        rerender(<Button size="icon">Icon</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('data-size', 'icon');
    });

    it('can be disabled', () => {
        render(<Button disabled>Disabled</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('handles click events', async () => {
        const user = userEvent.setup();
        let clicked = false;
        render(<Button onClick={() => { clicked = true; }}>Click</Button>);

        await user.click(screen.getByRole('button'));
        expect(clicked).toBe(true);
    });

    it('does not fire click when disabled', async () => {
        const user = userEvent.setup();
        let clicked = false;
        render(<Button disabled onClick={() => { clicked = true; }}>Click</Button>);

        await user.click(screen.getByRole('button'));
        expect(clicked).toBe(false);
    });

    it('accepts custom className', () => {
        render(<Button className="custom-class">Custom</Button>);
        expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('has correct data-slot attribute', () => {
        render(<Button>Button</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('data-slot', 'button');
    });
});

describe('Badge Component', () => {
    it('renders with default variant', () => {
        render(<Badge>New</Badge>);
        expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('renders with different variants', () => {
        const { rerender } = render(<Badge variant="default">Default</Badge>);
        expect(screen.getByText('Default')).toHaveAttribute('data-slot', 'badge');

        rerender(<Badge variant="secondary">Secondary</Badge>);
        expect(screen.getByText('Secondary')).toBeInTheDocument();

        rerender(<Badge variant="destructive">Destructive</Badge>);
        expect(screen.getByText('Destructive')).toBeInTheDocument();

        rerender(<Badge variant="outline">Outline</Badge>);
        expect(screen.getByText('Outline')).toBeInTheDocument();
    });

    it('accepts custom className', () => {
        render(<Badge className="custom-badge">Test</Badge>);
        expect(screen.getByText('Test')).toHaveClass('custom-badge');
    });

    it('has correct data-slot attribute', () => {
        render(<Badge>Badge</Badge>);
        expect(screen.getByText('Badge')).toHaveAttribute('data-slot', 'badge');
    });
});

describe('Card Component', () => {
    it('renders Card with all sections', () => {
        render(
            <Card>
                <CardHeader>
                    <CardTitle>Title</CardTitle>
                    <CardDescription>Description</CardDescription>
                </CardHeader>
                <CardContent>Content here</CardContent>
                <CardFooter>Footer</CardFooter>
            </Card>
        );

        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByText('Content here')).toBeInTheDocument();
        expect(screen.getByText('Footer')).toBeInTheDocument();
    });

    it('renders Card without optional sections', () => {
        render(
            <Card>
                <CardContent>Just content</CardContent>
            </Card>
        );

        expect(screen.getByText('Just content')).toBeInTheDocument();
    });

    it('accepts custom className on Card', () => {
        render(<Card className="custom-card">Test</Card>);
        expect(screen.getByText('Test').closest('[data-slot="card"]')).toHaveClass('custom-card');
    });
});

describe('Input Component', () => {
    it('renders text input', () => {
        render(<Input type="text" placeholder="Enter text" />);
        expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders with different types', () => {
        const { rerender } = render(<Input type="email" placeholder="Email" />);
        expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email');

        rerender(<Input type="password" placeholder="Password" />);
        expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');

        rerender(<Input type="number" placeholder="Number" />);
        expect(screen.getByPlaceholderText('Number')).toHaveAttribute('type', 'number');
    });

    it('handles value changes', async () => {
        const user = userEvent.setup();
        render(<Input type="text" placeholder="Type here" />);

        const input = screen.getByPlaceholderText('Type here');
        await user.type(input, 'Hello World');

        expect(input).toHaveValue('Hello World');
    });

    it('can be disabled', () => {
        render(<Input disabled placeholder="Disabled" />);
        expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
    });

    it('accepts custom className', () => {
        render(<Input className="custom-input" placeholder="Custom" />);
        expect(screen.getByPlaceholderText('Custom')).toHaveClass('custom-input');
    });
});

describe('Label Component', () => {
    it('renders label text', () => {
        render(<Label>Username</Label>);
        expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('associates with input via htmlFor', () => {
        render(
            <>
                <Label htmlFor="test-input">Test Label</Label>
                <Input id="test-input" />
            </>
        );

        expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });

    it('accepts custom className', () => {
        render(<Label className="custom-label">Custom</Label>);
        expect(screen.getByText('Custom')).toHaveClass('custom-label');
    });
});
