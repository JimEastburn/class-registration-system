import type { Metadata } from 'next';
import Image from 'next/image';
import { Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const REGISTRATION_URL = 'https://class-registration.austinaac.org/';
const TEACHER_EMAIL = 'AwesomeArtAustin@gmail.com';

const AMBER_CTA_CLASS =
  'h-auto border-amber-300 bg-amber-200/80 px-10 py-5 text-base font-semibold text-slate-900 hover:bg-accent hover:text-accent-foreground sm:text-lg';

export const metadata: Metadata = {
  title:
    'Art Classes with Allison Lash | Austin Arts + Academic Collaborative',
  description:
    'Join artist and educator Allison Lash for hands-on Clay, Printmaking, and Photography classes at the Austin Arts + Academic Collaborative. Enroll for Fall 2026.',
  openGraph: {
    title: 'Art Classes with Allison Lash',
    description:
      'Hands-on Clay, Printmaking, and Photography classes at the Austin Arts + Academic Collaborative.',
    type: 'website',
  },
};

type ClassInfo = {
  name: string;
  image: string;
  supplyFee: string | null;
  description: string;
  note?: string;
};

const CLASSES: ClassInfo[] = [
  {
    name: 'Clay Class',
    image: '/ClayClass.avif',
    supplyFee: '$100',
    description: `Using clay and glazes, we will explore a variety of hand-building techniques, including pinch, coil, and slab construction. We'll also experiment with different glazes and underglazes to create a range of surface effects. All pieces will be kiln-fired, and students will create functional pottery that is food-safe and able to hold liquids.`,
  },
  {
    name: 'Printmaking Class',
    image: '/PrintmakingClass.avif',
    supplyFee: '$50',
    description: `In this class, we'll explore silkscreen, foam-plate etching, block printing, and cyanotype, learning the basics of each technique. Students will turn their original designs into wearable art like up-cycled t-shirts, tote bags, bandanas, and patches while experimenting with color and pattern.`,
  },
  {
    name: 'Photography (MS / HS)',
    image: '/PhotographyClass.avif',
    supplyFee: null,
    description: `Using cell phones, iPads and/or affordable digital cameras, students will explore the fundamentals of photography, including color, texture, form, composition, and storytelling. We'll delve into a brief history of photography and experiment with creating digital negatives to produce archival cyanotype sun prints on paper and textiles. Students will also explore toning techniques to create alternative colors beyond the classic cyan blue, as well as the possibility of translating photographic images into 3-D textile printed sculptures (which would also include hand-sewing).`,
    note: `Please talk to Allison if you don't have access to a digital camera, phone, or iPad.`,
  },
];

const BIO_PARAGRAPHS: string[] = [
  `Hi, I'm Allison (she/her)—an artist, educator, and mom who's passionate about creating hands-on opportunities for people of all ages to explore the visual arts.`,
  `I'm a First Generation College Graduate and earned my Master of Fine Arts in Visual Arts from the Mason Gross School of the Arts at Rutgers University in New Jersey. After completing my graduate studies, I taught photography (darkroom, digital and alternative processes) as an adjunct instructor at several colleges and trained in the Reggio Emilia approach with Studio In A School and Pratt Institute before becoming a public school art educator in NYC.`,
];

export default function AllisonLashPage() {
  return (
    <div className="text-foreground">
      {/* Hero */}
      <section className="relative bg-slate-900">
        <div className="absolute inset-0 z-0">
          <Image
            src="/Together_FADE.webp"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-slate-900/60" />
        </div>
        <div className="relative z-10">
          <nav className="container mx-auto flex items-center px-4 py-6">
            <Image
              src="/AAC_FINAL.webp"
              alt="Austin Arts + Academic Collaborative"
              width={165}
              height={152}
              className="h-auto w-20 object-contain md:w-[140px]"
              priority
            />
          </nav>
          <div className="container mx-auto px-4 pt-6 pb-20 text-center md:pt-12 md:pb-28">
            <p className="text-secondary mb-4 text-sm font-semibold tracking-widest uppercase">
              Austin Arts + Academic Collaborative
            </p>
            <h1 className="mb-6 text-4xl leading-tight font-bold tracking-tight md:text-6xl">
              <span className="block text-white">Art Classes with</span>
              <span className="text-primary block">Allison Lash</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300 md:text-xl">
              Hands-on Clay, Printmaking, and Photography classes for Fall 2026
              — explore materials, techniques, and storytelling in a supportive
              studio environment.
            </p>
            <Button
              asChild
              size="lg"
              variant="outline"
              className={AMBER_CTA_CLASS}
            >
              <a href={REGISTRATION_URL}>Register Now</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Classes */}
      <section className="bg-background">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-foreground text-3xl font-bold tracking-tight md:text-4xl">
              Fall 2026 Classes
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              Three hands-on art classes taught by Allison Lash.
            </p>
          </div>
          <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-8">
            {CLASSES.map((classInfo) => (
              <Card key={classInfo.name} className="overflow-hidden pt-0">
                <div className="relative aspect-[16/9] w-full">
                  <Image
                    src={classInfo.image}
                    alt={classInfo.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl">{classInfo.name}</CardTitle>
                  {classInfo.supplyFee && (
                    <Badge variant="secondary">
                      Supply fee: {classInfo.supplyFee}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    {classInfo.description}
                  </p>
                  {classInfo.note && (
                    <p className="text-muted-foreground text-sm italic">
                      * {classInfo.note}
                    </p>
                  )}
                  <div className="border-border flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t pt-4">
                    <span className="text-muted-foreground text-sm font-medium">
                      Per Semester Tuition & Fees:
                    </span>
                    <span className="text-foreground font-semibold">
                      $255 + community fee
                    </span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <a href={REGISTRATION_URL}>Register Now</a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Teacher */}
      <section className="bg-muted/50 border-border border-y">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-[240px_1fr] md:gap-12">
            <div className="relative mx-auto aspect-square w-48 overflow-hidden rounded-2xl shadow-sm md:mx-0 md:w-full">
              <Image
                src="/AllisonLash.avif"
                alt="Allison Lash"
                fill
                sizes="(max-width: 768px) 192px, 240px"
                className="object-cover object-top"
              />
            </div>
            <div>
              <p className="text-primary text-sm font-semibold tracking-widest uppercase">
                Meet Your Teacher
              </p>
              <h2 className="text-foreground mt-1 text-3xl font-bold">
                Allison Lash
              </h2>
              <p className="text-muted-foreground mt-1 font-medium">Arts</p>
              <div className="text-muted-foreground mt-4 space-y-4 leading-relaxed">
                {BIO_PARAGRAPHS.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                ))}
              </div>
              <a
                href={`mailto:${TEACHER_EMAIL}`}
                className="text-primary mt-6 inline-flex items-center gap-2 font-medium hover:underline"
              >
                <Mail className="size-4" />
                {TEACHER_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-primary">
        <div className="container mx-auto px-4 py-16 text-center md:py-20">
          <h2 className="text-primary-foreground text-3xl font-bold tracking-tight md:text-4xl">
            Ready to enroll?
          </h2>
          <p className="text-primary-foreground/80 mx-auto mt-3 max-w-xl text-lg">
            {"Secure your student's spot in Allison's Fall 2026 art classes today."}
          </p>
          <Button
            asChild
            size="lg"
            variant="outline"
            className={`mt-8 ${AMBER_CTA_CLASS}`}
          >
            <a href={REGISTRATION_URL}>Register Now</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
