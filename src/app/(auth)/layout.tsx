import Image from 'next/image';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-16 w-full max-w-7xl">
                {/* Left Decorative Image */}
                <div className="hidden lg:block flex-shrink-0 w-[165px]">
                    <Image
                        src="/AAC_FINAL.webp"
                        alt="Austin AAC"
                        width={165}
                        height={152}
                        className="object-contain"
                        priority
                    />
                </div>

                {/* Center Content */}
                <div className="flex flex-col w-full max-w-md gap-6">
                    {children}
                </div>

                {/* Right Decorative Image */}
                <div className="hidden lg:block flex-shrink-0 w-[165px]">
                    <Image
                        src="/AAC_FINAL.webp"
                        alt="Austin AAC"
                        width={165}
                        height={152}
                        className="object-contain"
                        priority
                    />
                </div>
            </div>
        </div>
    );
}
