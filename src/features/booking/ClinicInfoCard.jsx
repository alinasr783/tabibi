import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export default function ClinicInfoCard({clinic}) {
  return (
    <Card className="mt-6 mb-6 sm:mb-8">
      <CardHeader className="pb-3 text-right">
        <CardTitle className="text-lg sm:text-xl">{clinic?.name}</CardTitle>
        <CardDescription className="text-sm text-right">{clinic?.address}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Pricing information removed as per user request */}
      </CardContent>
    </Card>
  );
}