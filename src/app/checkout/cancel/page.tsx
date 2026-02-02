import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import Link from "next/link";

export default function CheckoutCancelPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <XCircle className="h-16 w-16 text-red-500" />
                    </div>
                    <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">
                        Your payment was cancelled and your card was not charged.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        If you experienced an issue, you can try again or contact support.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center gap-4">
                    <Button asChild>
                        <Link href="/parent/enrollments">
                            Return to Enrollments
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/parent/browse">
                            Browse Classes
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
