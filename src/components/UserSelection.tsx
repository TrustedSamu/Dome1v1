import { Box, Heading, SimpleGrid, VStack, Text, useColorModeValue, Button } from '@chakra-ui/react'
import { FaUser } from 'react-icons/fa'

interface UserSelectionProps {
  onSelectUser: (user: string) => void
}

const UserSelection = ({ onSelectUser }: UserSelectionProps) => {
  const bgColor = useColorModeValue('white', 'gray.800')
  const users = ['Dominik', 'Samu']

  return (
    <VStack spacing={8} p={{ base: 4, md: 8 }}>
      <Heading size={{ base: "xl", md: "2xl" }} color="purple.600" textAlign="center">Welcome to DomeApp</Heading>
      <Text fontSize={{ base: "lg", md: "xl" }} color="gray.600" textAlign="center">Select your profile to continue</Text>
      
      <SimpleGrid 
        columns={{ base: 1, md: 2 }} 
        spacing={{ base: 4, md: 8 }} 
        w="full" 
        maxW="4xl" 
        mx="auto"
      >
        {users.map((user) => (
          <Box
            key={user}
            bg={bgColor}
            p={{ base: 6, md: 8 }}
            borderRadius="xl"
            boxShadow="xl"
            cursor="pointer"
            _hover={{ transform: 'scale(1.02)', transition: 'all 0.2s' }}
            onClick={() => onSelectUser(user)}
          >
            <VStack spacing={4}>
              <Box
                p={4}
                bg="purple.100"
                borderRadius="full"
                color="purple.600"
              >
                <FaUser size={32} />
              </Box>
              <Heading size={{ base: "md", md: "lg" }}>{user}</Heading>
              <Button
                colorScheme="purple"
                size={{ base: "md", md: "lg" }}
                w="full"
                onClick={() => onSelectUser(user)}
              >
                Select Profile
              </Button>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>
    </VStack>
  )
}

export default UserSelection 