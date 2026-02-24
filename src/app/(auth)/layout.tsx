import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-900 p-4 -mb-24 md:-mb-12">
      <div className="flex w-full max-w-7xl flex-col items-start justify-center gap-16 lg:flex-row">
        {/* Left Decorative Image */}
        <div className="hidden w-[165px] flex-shrink-0 lg:sticky lg:top-[33vh] lg:block">
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
        <div className="flex w-full max-w-md flex-col gap-6">{children}</div>

        {/* Right Decorative Image */}
        <div className="hidden w-[165px] flex-shrink-0 lg:sticky lg:top-[33vh] lg:block">
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
